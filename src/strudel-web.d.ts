declare module '@strudel/web/web.mjs' {
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>
  export function hush(): void
  export function initAudio(options?: unknown): Promise<void>
  export function initStrudel(options?: {
    prebake?: () => unknown | Promise<unknown>
    miniAllStrings?: boolean
  }): Promise<unknown>
  export function samples(source: string): unknown | Promise<unknown>
}

declare module '@strudel/soundfonts' {
  export function registerSoundfonts(): void
}
