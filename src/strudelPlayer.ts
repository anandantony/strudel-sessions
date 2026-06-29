let strudelPromise: Promise<typeof import('@strudel/web/web.mjs')> | undefined
let soundfontsPromise: Promise<typeof import('@strudel/soundfonts')> | undefined
let initPromise: Promise<unknown> | undefined

const loadStrudel = () => {
  strudelPromise ??= import('@strudel/web/web.mjs')
  return strudelPromise
}

const loadSoundfonts = () => {
  soundfontsPromise ??= import('@strudel/soundfonts')
  return soundfontsPromise
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
  await evaluate(source)
}

export function stopStrudel() {
  if (strudelPromise) {
    void strudelPromise.then(({ hush }) => hush())
  }
}
