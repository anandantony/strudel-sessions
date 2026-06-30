export type Track = {
  id: string
  title: string
  subtitle: string
  tempo: string
  palette: string
  sourceFile: string
  replUrl: string
}

export type SpectrumBand = {
  db: number
  frequency: number
  level: number
}

export type TapePhase =
  | 'rackBrowsing'
  | 'cassetteSelected'
  | 'loading'
  | 'playerFocused'
  | 'caseInspect'

export type TapeFocus = 'rack' | 'selection' | 'player' | 'case'

export type TransportStatus = 'READY' | 'SELECT' | 'LOADING' | 'PLAY' | 'PAUSED' | 'STOPPED'
