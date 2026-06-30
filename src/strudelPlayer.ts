let strudelPromise: Promise<typeof import('@strudel/web/web.mjs')> | undefined
let soundfontsPromise: Promise<typeof import('@strudel/soundfonts')> | undefined
let superdoughPromise: Promise<typeof import('superdough')> | undefined
let initPromise: Promise<unknown> | undefined
let currentVolume = 0.8

const ANALYSER_ID = 1

const loadStrudel = () => {
  strudelPromise ??= import('@strudel/web/web.mjs')
  return strudelPromise
}

const loadSoundfonts = () => {
  soundfontsPromise ??= import('@strudel/soundfonts')
  return soundfontsPromise
}

const loadSuperdough = () => {
  superdoughPromise ??= import('superdough')
  return superdoughPromise
}

const ensureStrudel = () => {
  initPromise ??= Promise.all([loadStrudel(), loadSoundfonts()]).then(
    ([{ initAudio, initStrudel, samples }, { registerSoundfonts }]) => {
      registerSoundfonts()
      return initStrudel({
        prebake: () =>
          Promise.all([
            initAudio(),
            samples('github:tidalcycles/dirt-samples'),
            samples('github:eddyflux/crate'),
          ]),
      })
    },
  )
  return initPromise
}

export async function playStrudelSource(source: string) {
  const { evaluate, hush } = await loadStrudel()
  await ensureStrudel()
  hush()
  await evaluate(`${source.trim()}\n.analyze(${ANALYSER_ID})`)
  await setStrudelVolume(currentVolume)
}

export function stopStrudel() {
  if (strudelPromise) {
    void strudelPromise.then(({ hush }) => hush())
  }
}

export async function setStrudelVolume(volume: number) {
  currentVolume = volume
  try {
    const { getSuperdoughAudioController } = await loadSuperdough()
    const controller = getSuperdoughAudioController()
    if (controller && controller.output && controller.output.destinationGain) {
      const audioCtx = controller.audioContext
      controller.output.destinationGain.gain.setValueAtTime(volume, audioCtx.currentTime)
    }
  } catch (e) {
    console.warn('Error setting strudel volume:', e)
  }
}

export async function readStrudelSpectrum(bandCount = 32) {
  const { analysers, getAnalyzerData } = await loadSuperdough()
  if (!analysers[ANALYSER_ID]) {
    return []
  }

  const data = getAnalyzerData('frequency', ANALYSER_ID)
  const nyquist = 22050
  const minFrequency = 63
  const maxFrequency = 16000
  const frequencyToBin = (frequency: number) =>
    Math.max(0, Math.min(data.length - 1, Math.round((frequency / nyquist) * data.length)))

  return Array.from({ length: bandCount }, (_, bandIndex) => {
    const startFrequency =
      minFrequency * (maxFrequency / minFrequency) ** (bandIndex / Math.max(1, bandCount))
    const endFrequency =
      minFrequency * (maxFrequency / minFrequency) ** ((bandIndex + 1) / Math.max(1, bandCount))
    const start = frequencyToBin(startFrequency)
    const end = Math.max(start + 1, frequencyToBin(endFrequency))
    let sum = 0
    for (let index = start; index < end; index += 1) {
      sum += data[index]
    }
    const db = sum / Math.max(1, end - start)
    const normalized = Math.max(0, Math.min(1, (db + 96) / 96))
    return {
      db,
      frequency: Math.round(((start + end) / 2 / data.length) * nyquist),
      level: normalized,
    }
  })
}
