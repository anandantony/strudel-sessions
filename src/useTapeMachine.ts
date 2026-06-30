import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tracks } from './tracks'
import type { SpectrumBand, TapeFocus, TapePhase, TransportStatus } from './types'
import { playStrudelSource, readStrudelSpectrum, stopStrudel } from './strudelPlayer'

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const secondsToMMSS = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const createZeroSpectrum = (count = 32): SpectrumBand[] =>
  Array.from({ length: count }, (_, index) => ({
    db: -96,
    frequency: Math.round(63 * (16000 / 63) ** (index / Math.max(1, count - 1))),
    level: 0,
  }))

const nextWrappedIndex = (current: number, direction: -1 | 1) => {
  const next = current + direction
  if (next < 0) return tracks.length - 1
  if (next >= tracks.length) return 0
  return next
}

export function useTapeMachine() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [phase, setPhase] = useState<TapePhase>('rackBrowsing')
  const [focus, setFocus] = useState<TapeFocus>('rack')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false)
  const [cassetteLoaded, setCassetteLoaded] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  const [source, setSource] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [spectrumBands, setSpectrumBands] = useState<SpectrumBand[]>([])

  const clockFrame = useRef<number | undefined>(undefined)
  const spectrumFrame = useRef<number | undefined>(undefined)
  const transitionTimeout = useRef<number | undefined>(undefined)
  const playStartedAt = useRef(0)

  const activeTrack = tracks[activeIndex]
  const zeroSpectrum = useMemo(() => createZeroSpectrum(32), [])
  const visibleSpectrum = isPlaying && spectrumBands.length ? spectrumBands : zeroSpectrum
  const elapsedLabel = secondsToMMSS(elapsedSeconds)

  const status: TransportStatus = isLoadingPlayback
    ? 'LOADING'
    : isPlaying
      ? 'PLAY'
      : cassetteLoaded
        ? 'PAUSED'
        : phase === 'cassetteSelected'
          ? 'SELECT'
          : 'READY'

  const clearTransition = useCallback(() => {
    if (transitionTimeout.current) {
      window.clearTimeout(transitionTimeout.current)
      transitionTimeout.current = undefined
    }
  }, [])

  const resetAudioState = useCallback((nextPhase: TapePhase, nextFocus: TapeFocus) => {
    stopStrudel()
    setIsPlaying(false)
    setIsLoadingPlayback(false)
    setCassetteLoaded(false)
    setElapsedSeconds(0)
    setSpectrumBands([])
    setPhase(nextPhase)
    setFocus(nextFocus)
  }, [])

  useEffect(() => {
    let isCurrent = true
    setSource('')

    fetch(publicAsset(activeTrack.sourceFile))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load ${activeTrack.sourceFile}`)
        }
        return response.text()
      })
      .then((text) => {
        if (isCurrent) {
          setSource(text)
          setPlaybackError('')
        }
      })
      .catch(() => {
        if (isCurrent) {
          setSource('')
          setPlaybackError('Source could not be loaded.')
        }
      })

    return () => {
      isCurrent = false
    }
  }, [activeTrack.sourceFile])

  useEffect(
    () => () => {
      stopStrudel()
      clearTransition()
      if (clockFrame.current) {
        window.cancelAnimationFrame(clockFrame.current)
      }
      if (spectrumFrame.current) {
        window.cancelAnimationFrame(spectrumFrame.current)
      }
    },
    [clearTransition],
  )

  useEffect(() => {
    if (!isPlaying) return undefined

    const tick = () => {
      setElapsedSeconds(Math.floor((performance.now() - playStartedAt.current) / 1000))
      clockFrame.current = window.requestAnimationFrame(tick)
    }

    clockFrame.current = window.requestAnimationFrame(tick)
    return () => {
      if (clockFrame.current) {
        window.cancelAnimationFrame(clockFrame.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    let isCurrent = true

    const tick = async () => {
      if (isPlaying) {
        const nextBands = await readStrudelSpectrum(32)
        if (isCurrent && nextBands.length) {
          setSpectrumBands(nextBands)
        }
      } else if (isCurrent) {
        setSpectrumBands([])
      }

      spectrumFrame.current = window.requestAnimationFrame(tick)
    }

    spectrumFrame.current = window.requestAnimationFrame(tick)
    return () => {
      isCurrent = false
      if (spectrumFrame.current) {
        window.cancelAnimationFrame(spectrumFrame.current)
      }
    }
  }, [isPlaying])

  const selectTrack = useCallback(
    (index: number) => {
      if (index === activeIndex && phase !== 'rackBrowsing') {
        setPhase('cassetteSelected')
        setFocus('selection')
        return
      }

      clearTransition()
      resetAudioState('cassetteSelected', 'selection')
      setActiveIndex(index)
      setPlaybackError('')
    },
    [activeIndex, clearTransition, phase, resetAudioState],
  )

  const moveTrack = useCallback(
    (direction: -1 | 1) => {
      selectTrack(nextWrappedIndex(activeIndex, direction))
    },
    [activeIndex, selectTrack],
  )

  const browseRack = useCallback(() => {
    clearTransition()
    resetAudioState('rackBrowsing', 'rack')
    setPlaybackError('')
  }, [clearTransition, resetAudioState])

  const loadSelected = useCallback(async () => {
    if (!source || isLoadingPlayback) return

    clearTransition()
    setPhase('loading')
    setFocus('player')
    setIsLoadingPlayback(true)
    setPlaybackError('')

    transitionTimeout.current = window.setTimeout(() => {
      setCassetteLoaded(true)
      setPhase('playerFocused')
    }, 820)

    try {
      await playStrudelSource(source)
      playStartedAt.current = performance.now() - elapsedSeconds * 1000
      setCassetteLoaded(true)
      setIsPlaying(true)
      setPhase('playerFocused')
      setFocus('player')
    } catch (error) {
      setIsPlaying(false)
      setCassetteLoaded(false)
      setPhase('cassetteSelected')
      setFocus('selection')
      setPlaybackError(error instanceof Error ? error.message : 'Unable to play this track.')
    } finally {
      setIsLoadingPlayback(false)
    }
  }, [clearTransition, elapsedSeconds, isLoadingPlayback, source])

  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      stopStrudel()
      setIsPlaying(false)
      setSpectrumBands([])
      setPhase('playerFocused')
      setFocus('player')
      return
    }

    if (cassetteLoaded) {
      try {
        setPlaybackError('')
        await playStrudelSource(source)
        playStartedAt.current = performance.now() - elapsedSeconds * 1000
        setIsPlaying(true)
        setPhase('playerFocused')
        setFocus('player')
      } catch (error) {
        setPlaybackError(error instanceof Error ? error.message : 'Unable to play this track.')
      }
      return
    }

    await loadSelected()
  }, [cassetteLoaded, elapsedSeconds, isPlaying, loadSelected, source])

  const stop = useCallback(() => {
    stopStrudel()
    setIsPlaying(false)
    setSpectrumBands([])
    setPhase(cassetteLoaded ? 'playerFocused' : 'cassetteSelected')
    setFocus(cassetteLoaded ? 'player' : 'selection')
  }, [cassetteLoaded])

  const eject = useCallback(() => {
    clearTransition()
    resetAudioState('cassetteSelected', 'selection')
  }, [clearTransition, resetAudioState])

  const inspectCase = useCallback(() => {
    if (!cassetteLoaded && phase !== 'playerFocused') return
    setPhase('caseInspect')
    setFocus('case')
  }, [cassetteLoaded, phase])

  const returnToPlayer = useCallback(() => {
    setPhase(cassetteLoaded ? 'playerFocused' : 'cassetteSelected')
    setFocus(cassetteLoaded ? 'player' : 'selection')
  }, [cassetteLoaded])

  return {
    activeIndex,
    activeTrack,
    cassetteLoaded,
    elapsedLabel,
    focus,
    isLoadingPlayback,
    isPlaying,
    phase,
    playbackError,
    source,
    status,
    tracks,
    visibleSpectrum,
    browseRack,
    eject,
    inspectCase,
    loadSelected,
    moveTrack,
    returnToPlayer,
    selectTrack,
    stop,
    togglePlayback,
  }
}
