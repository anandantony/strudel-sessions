import {
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './App.css'
import { playStrudelSource, stopStrudel } from './strudelPlayer'

type Track = {
  id: string
  title: string
  subtitle: string
  duration: string
  tempo: string
  palette: string
  sourceFile: string
  replUrl: string
}

type CustomProperties = CSSProperties & Record<`--${string}`, string | number>

type TrackArt = {
  vars: CustomProperties
  titlePlacement: 'diagonal' | 'block' | 'side'
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const tracks: Track[] = [
  {
    id: 'midnight-splice',
    title: 'Midnight Splice',
    subtitle: 'dusty tape chords over soft broken drums',
    duration: '03:18',
    tempo: '88 bpm',
    palette: '#e8592d',
    sourceFile: 'tracks/midnight-splice.strudel',
    replUrl: 'https://strudel.cc/',
  },
  {
    id: 'oxide-bloom',
    title: 'Oxide Bloom',
    subtitle: 'warm glass pads with a small motorik pulse',
    duration: '04:06',
    tempo: '104 bpm',
    palette: '#2a9d8f',
    sourceFile: 'tracks/oxide-bloom.strudel',
    replUrl: 'https://strudel.cc/',
  },
  {
    id: 'rewind-sun',
    title: 'Rewind Sun',
    subtitle: 'sun-faded arps and bass from the back shelf',
    duration: '02:52',
    tempo: '96 bpm',
    palette: '#f2b544',
    sourceFile: 'tracks/rewind-sun.strudel',
    replUrl: 'https://strudel.cc/',
  },
  {
    id: 'solar',
    title: 'Solar',
    subtitle: 'gentle sun-faded synth pads and a skipping rhythm',
    duration: '03:44',
    tempo: '90 bpm',
    palette: '#f2b544',
    sourceFile: 'tracks/solar.strudel',
    replUrl: 'https://strudel.cc/',
  },
]

const coverPatternCount = 12

const hashString = (value: string) =>
  Array.from(value).reduce((hash, character) => {
    const nextHash = (hash << 5) - hash + character.charCodeAt(0)
    return nextHash >>> 0
  }, 2166136261)

const seededRandom = (seed: number) => {
  let value = seed || 1
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const createTrackArt = (track: Track, index: number): TrackArt => {
  const random = seededRandom(hashString(`${track.id}-${track.title}`))
  const hue = Math.round(random() * 360)
  const accentHue = (hue + 90 + Math.round(random() * 90)) % 360
  const angle = Math.round(20 + random() * 130)
  const scale = (0.72 + random() * 0.5).toFixed(2)
  const insetX = Math.round(10 + random() * 18)
  const insetY = Math.round(12 + random() * 22)
  const titlePlacement = (['diagonal', 'block', 'side'] as const)[index % 3]

  return {
    titlePlacement,
    vars: {
      '--art-hue': hue,
      '--art-accent-hue': accentHue,
      '--art-angle': `${angle}deg`,
      '--art-scale': scale,
      '--art-x': `${insetX}%`,
      '--art-y': `${insetY}%`,
      '--art-paper': `hsl(${hue} 44% 83%)`,
      '--art-ink': `hsl(${(hue + 185) % 360} 46% 17%)`,
      '--art-accent': `hsl(${accentHue} 78% 52%)`,
      '--art-soft': `hsl(${(hue + 35) % 360} 68% 69%)`,
    },
  }
}

function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false)
  const [recordOnDeck, setRecordOnDeck] = useState(false)
  const [deckTrackIndex, setDeckTrackIndex] = useState(0)
  const [isSwitchingTrack, setIsSwitchingTrack] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  const [showSource, setShowSource] = useState(false)
  const [source, setSource] = useState('')
  const isSwitchingTrackRef = useRef(false)
  const recordOnDeckRef = useRef(false)
  const switchTimeout = useRef<number | undefined>(undefined)
  const deckArtTimeout = useRef<number | undefined>(undefined)

  const activeTrack = tracks[activeIndex]
  const trackArt = useMemo(() => tracks.map(createTrackArt), [])
  const activeArt = trackArt[activeIndex]
  const deckTrack = tracks[deckTrackIndex]
  const deckArt = trackArt[deckTrackIndex]

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
      isSwitchingTrackRef.current = false
      recordOnDeckRef.current = false
      if (switchTimeout.current) {
        window.clearTimeout(switchTimeout.current)
      }
      if (deckArtTimeout.current) {
        window.clearTimeout(deckArtTimeout.current)
      }
    },
    [],
  )

  const visualBars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, index) => ({
        id: index,
        delay: `${(index % 8) * -0.16}s`,
        height: `${26 + ((index * 17 + activeIndex * 11) % 58)}%`,
      })),
    [activeIndex],
  )

  const beginTrackSwitch = () => {
    if (isSwitchingTrackRef.current) return false
    isSwitchingTrackRef.current = true
    setIsSwitchingTrack(true)
    if (switchTimeout.current) {
      window.clearTimeout(switchTimeout.current)
    }
    switchTimeout.current = window.setTimeout(() => {
      isSwitchingTrackRef.current = false
      setIsSwitchingTrack(false)
    }, 360)
    return true
  }

  const updateRecordOnDeck = (isOnDeck: boolean) => {
    recordOnDeckRef.current = isOnDeck
    setRecordOnDeck(isOnDeck)
  }

  const changeTrack = (nextIndex: number) => {
    if (!beginTrackSwitch()) return
    const shouldResume = isPlaying
    const shouldHoldDeckArt = recordOnDeckRef.current

    stopStrudel()
    setIsPlaying(false)
    updateRecordOnDeck(false)
    setIsLoadingPlayback(false)
    setActiveIndex(nextIndex)

    if (deckArtTimeout.current) {
      window.clearTimeout(deckArtTimeout.current)
    }
    deckArtTimeout.current = window.setTimeout(
      () => setDeckTrackIndex(nextIndex),
      shouldHoldDeckArt ? 430 : 0,
    )

    if (shouldResume) {
      setPlaybackError('Press play to start the selected track.')
    }
  }

  const moveTrack = (direction: -1 | 1) => {
    const next = activeIndex + direction
    if (next < 0) {
      changeTrack(tracks.length - 1)
      return
    }
    if (next >= tracks.length) {
      changeTrack(0)
      return
    }
    changeTrack(next)
  }

  const selectTrack = (index: number) => {
    if (index === activeIndex) return
    changeTrack(index)
  }

  const togglePlayback = async () => {
    if (isPlaying) {
      stopStrudel()
      setIsPlaying(false)
      updateRecordOnDeck(true)
      return
    }

    setIsLoadingPlayback(true)
    setPlaybackError('')

    try {
      setDeckTrackIndex(activeIndex)
      await playStrudelSource(source)
      setIsPlaying(true)
      updateRecordOnDeck(true)
    } catch (error) {
      setIsPlaying(false)
      setPlaybackError(error instanceof Error ? error.message : 'Unable to play this track.')
    } finally {
      setIsLoadingPlayback(false)
    }
  }

  return (
    <main
      className="showcase"
      style={
        {
          '--track-color': activeTrack.palette,
          ...activeArt.vars,
        } as CustomProperties
      }
    >
      <div className="visualizer" aria-hidden="true">
        {visualBars.map((bar) => (
          <span
            key={bar.id}
            style={
              {
                '--bar-delay': bar.delay,
                '--bar-height': bar.height,
              } as CustomProperties
            }
          />
        ))}
      </div>

      <section className="deck" aria-label="Strudel music showcase">
        <header className="masthead">
          <div className="masthead-copy">
            <p className="eyebrow">Strudel sessions</p>
            <h1>Airwave Tape Archive</h1>
          </div>
          <div className="airwave" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <nav className="legal-links" aria-label="Legal links">
            <a className="text-link" href={publicAsset('tracks/LICENSE.txt')}>
              Track license
            </a>
            <a className="text-link" href={publicAsset('NOTICE.txt')}>
              Notices
            </a>
          </nav>
        </header>

        <div className="player-grid">
          <div className="carousel" aria-label="Track carousel">
            <button
              type="button"
              className="icon-button rail-button"
              aria-label="Previous track"
              disabled={isSwitchingTrack}
              onClick={() => moveTrack(-1)}
            >
              <ChevronLeft size={22} />
            </button>

            <div className="sleeve-stack">
              {tracks.map((track, index) => {
                const offset = index - activeIndex
                const art = trackArt[index]
                return (
                  <button
                    type="button"
                    key={track.id}
                    className="album-sleeve"
                    data-active={index === activeIndex}
                    data-loaded={index === activeIndex && recordOnDeck}
                    data-selectable={Math.abs(offset) <= 1}
                    style={
                      {
                        '--offset': offset,
                        '--distance': Math.abs(offset),
                        '--record-color': track.palette,
                        ...art.vars,
                      } as CustomProperties
                    }
                    aria-label={`Select ${track.title}`}
                    onClick={() => selectTrack(index)}
                    disabled={isSwitchingTrack}
                  >
                    <span className="sleeve-record" aria-hidden="true">
                      <span className="record-grooves" />
                      <span className="record-label">
                        {Array.from({ length: 6 }, (_, patternIndex) => (
                          <span key={patternIndex} />
                        ))}
                      </span>
                    </span>
                    <span className="cover-art">
                      <span className="cover-pattern" aria-hidden="true">
                        {Array.from({ length: coverPatternCount }, (_, patternIndex) => (
                          <span key={patternIndex} />
                        ))}
                      </span>
                      <span className="cover-title" data-placement={art.titlePlacement}>
                        {track.title}
                      </span>
                      <span className="cover-meta">{track.tempo}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="icon-button rail-button"
              aria-label="Next track"
              disabled={isSwitchingTrack}
              onClick={() => moveTrack(1)}
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <article className="console" aria-live="polite">
            <div
              className="turntable"
              data-loaded={recordOnDeck}
              data-spinning={isPlaying}
            >
              <div
                className="turntable-top"
                style={
                  {
                    '--record-color': deckTrack.palette,
                    ...deckArt.vars,
                  } as CustomProperties
                }
              >
                <div className="platter" aria-hidden="true">
                  <div className="player-record">
                    <span className="record-grooves" />
                    <span className="record-label">
                      {Array.from({ length: 6 }, (_, patternIndex) => (
                        <span key={patternIndex} />
                      ))}
                    </span>
                  </div>
                  <span className="spindle" />
                  <div className="tonearm" aria-hidden="true">
                    <span />
                  </div>
                </div>
              </div>
              <div className="turntable-label">
                <p>{activeTrack.title}</p>
                <span>{activeTrack.subtitle}</span>
              </div>
            </div>

            <div className="track-meta">
              <p>{activeTrack.duration}</p>
              <p>{activeTrack.tempo}</p>
              <p>Source-backed</p>
            </div>

            <div className="transport" aria-label="Playback controls">
              <button
                type="button"
                className="icon-button"
                aria-label="Previous track"
                disabled={isSwitchingTrack}
                onClick={() => moveTrack(-1)}
              >
                <SkipBack size={20} />
              </button>
              <button
                type="button"
                className="play-button"
                aria-label={isPlaying ? 'Pause track' : 'Play track'}
                disabled={isLoadingPlayback || !source}
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause size={26} /> : <Play size={26} />}
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Next track"
                disabled={isSwitchingTrack}
                onClick={() => moveTrack(1)}
              >
                <SkipForward size={20} />
              </button>
              <button
                type="button"
                className="source-toggle"
                aria-expanded={showSource}
                onClick={() => setShowSource((value) => !value)}
              >
                <Code2 size={18} />
                Liner source
              </button>
            </div>
            <p className="playback-status" aria-live="polite">
              {isLoadingPlayback ? 'Loading Strudel audio...' : playbackError}
            </p>
          </article>
        </div>

        <section className="source-cover" data-open={showSource}>
          <div className="source-header">
            <div>
              <p className="eyebrow">Flip cover</p>
              <h2>{activeTrack.title} source</h2>
            </div>
            <a
              className="repl-link"
              href={activeTrack.replUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={17} />
              Open Strudel
            </a>
          </div>
          <pre>
            <code>{source}</code>
          </pre>
        </section>
      </section>
    </main>
  )
}

export default App
