import React, { useState, useEffect, useRef } from 'react'
import { Play, Square, LogOut, Code2 } from 'lucide-react'
import './VectorTerminalShowcase.css'
import { setStrudelVolume } from './strudelPlayer'
import { useTapeMachine } from './useTapeMachine'

type TapeMachine = ReturnType<typeof useTapeMachine>

interface VectorTerminalShowcaseProps {
  machine: TapeMachine
}

const updateSystemVolume = (vol: number) => {
  void setStrudelVolume(vol)
}

const formatCode = (source: string) => {
  if (!source) return <span>// NO SOURCE LOADED</span>
  
  return source.split('\n').map((line, idx) => {
    if (line.trim().startsWith('//')) {
      return <div key={idx} className="code-comment">{line}</div>
    }
    
    const parts = line.split(/(\b(?:s|n|sound|note|gain|pan|speed|vowel|room|size|delay|hpf|lpf|bp|clip|shape|gain|jux|every|sometimes|fast|slow|iter|rev)\b|\b\d+(?:\.\d+)?\b)/g)
    
    return (
      <div key={idx}>
        {parts.map((part, pIdx) => {
          if (['s', 'n', 'sound', 'note', 'gain', 'pan', 'speed', 'vowel', 'room', 'size', 'delay', 'hpf', 'lpf', 'bp', 'clip', 'shape', 'jux'].includes(part)) {
            return <span key={pIdx} className="code-function">{part}</span>
          }
          if (['every', 'sometimes', 'fast', 'slow', 'iter', 'rev'].includes(part)) {
            return <span key={pIdx} className="code-keyword">{part}</span>
          }
          if (/^\d+(?:\.\d+)?$/.test(part)) {
            return <span key={pIdx} className="code-number">{part}</span>
          }
          return <span key={pIdx}>{part}</span>
        })}
      </div>
    )
  })
}

const renderCardArtwork = (trackId: string, palette: string) => {
  const strokeColor = palette
  switch (trackId) {
    case 'midnight-splice':
      return (
        <svg viewBox="0 0 130 90" width="100%" height="100%">
          <circle cx="65" cy="45" r="28" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="65" cy="45" r="18" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="65" y1="5" x2="65" y2="85" stroke={strokeColor} strokeWidth="0.75" />
          <line x1="25" y1="45" x2="105" y2="45" stroke={strokeColor} strokeWidth="0.75" />
          <path d="M 45 45 Q 65 15 85 45" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      )
    case 'solar-break':
      return (
        <svg viewBox="0 0 130 90" width="100%" height="100%">
          <line x1="20" y1="20" x2="110" y2="20" stroke={strokeColor} strokeWidth="3" />
          <line x1="20" y1="35" x2="110" y2="35" stroke={strokeColor} strokeWidth="2.5" />
          <line x1="20" y1="50" x2="110" y2="50" stroke={strokeColor} strokeWidth="2" />
          <line x1="20" y1="65" x2="110" y2="65" stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="65" cy="42" r="12" fill="none" stroke={strokeColor} strokeWidth="1" />
        </svg>
      )
    case 'neon-cascade':
      return (
        <svg viewBox="0 0 130 90" width="100%" height="100%">
          <path d="M 15 45 Q 40 15 65 45 T 115 45" fill="none" stroke={strokeColor} strokeWidth="2" />
          <path d="M 15 55 Q 40 25 65 55 T 115 55" fill="none" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
          <circle cx="40" cy="30" r="3" fill={strokeColor} />
          <circle cx="90" cy="60" r="3" fill={strokeColor} />
        </svg>
      )
    case 'oxide-bloom':
      return (
        <svg viewBox="0 0 130 90" width="100%" height="100%">
          <rect x="35" y="15" width="60" height="60" rx="4" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="35" y1="45" x2="95" y2="45" stroke={strokeColor} strokeWidth="1" />
          <circle cx="65" cy="45" r="8" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="45" cy="25" r="2" fill={strokeColor} />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 130 90" width="100%" height="100%">
          <path d="M 20 70 L 65 20 L 110 70 Z" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="20" y1="70" x2="110" y2="70" stroke={strokeColor} strokeWidth="2" />
        </svg>
      )
  }
}

function VectorTerminalShowcase({ machine }: VectorTerminalShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [showCode, setShowCode] = useState(false) // Default state closed
  const [isInserting, setIsInserting] = useState(false)
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(
    machine.cassetteLoaded ? machine.activeIndex : null
  )
  const [dialRotation, setDialRotation] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const dialRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef(false)
  const lastYRef = useRef(0)

  const machineRef = useRef(machine)
  useEffect(() => {
    machineRef.current = machine
  }, [machine])

  // Call loadSelected the moment card is fully slotted AND source file fetch resolves
  useEffect(() => {
    if (
      activeCardIndex !== null &&
      !isInserting &&
      !machine.cassetteLoaded &&
      machine.source &&
      !machine.isLoadingPlayback
    ) {
      void machine.loadSelected()
    }
  }, [
    activeCardIndex,
    isInserting,
    machine.cassetteLoaded,
    machine.source,
    machine.isLoadingPlayback,
    machine.loadSelected,
  ])

  // Draw the real-time minimal oscilloscope waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const width = canvas.width
      const height = canvas.height
      const spectrum = machine.visibleSpectrum
      
      if (!spectrum || spectrum.length === 0) {
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        ctx.lineTo(width, height / 2)
        ctx.strokeStyle = 'rgba(29, 37, 28, 0.4)'
        ctx.lineWidth = 2
        ctx.stroke()
        animId = requestAnimationFrame(draw)
        return
      }

      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      
      const isPlaying = machine.isPlaying
      const waveAmplitude = isPlaying ? height * 0.42 : height * 0.04
      const timeFactor = performance.now() * 0.015

      for (let i = 0; i < spectrum.length; i++) {
        const band = spectrum[i]
        const x = (i / (spectrum.length - 1)) * width
        const value = band.level * waveAmplitude
        const offset = value * Math.sin(timeFactor + i * 0.4)
        ctx.lineTo(x, height / 2 + offset)
      }

      ctx.strokeStyle = '#1d251c'
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.stroke()
      
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [machine.visibleSpectrum, machine.isPlaying])

  const handleDialPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true
    lastYRef.current = e.clientY
    if (dialRef.current) {
      try {
        dialRef.current.setPointerCapture(e.pointerId)
      } catch (err) {
        console.warn(err)
      }
    }
  }

  const handleDialPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const deltaY = e.clientY - lastYRef.current
    lastYRef.current = e.clientY
    
    setDialRotation((prev) => (prev + deltaY * 1.5) % 360)
    setVolume((prev) => {
      const next = Math.max(0, Math.min(1, prev - deltaY * 0.012))
      updateSystemVolume(next)
      return next
    })
  }

  const handleDialPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false
    if (dialRef.current) {
      try {
        if (dialRef.current.hasPointerCapture(e.pointerId)) {
          dialRef.current.releasePointerCapture(e.pointerId)
        }
      } catch (err) {
        console.warn(err)
      }
    }
  }

  const handleLoadCard = (index: number) => {
    if (machine.isLoadingPlayback) return
    
    setIsInserting(true)
    setActiveCardIndex(index)

    if (machine.cassetteLoaded) {
      machine.eject()
    }

    machine.selectTrack(index)

    // Trigger sliding animation delay (850ms)
    setTimeout(() => {
      setIsInserting(false)
    }, 850)
  }

  const handleEjectCard = () => {
    machine.eject()
    setActiveCardIndex(null)
  }

  const renderVolumeBar = () => {
    const barsCount = 10
    const activeBars = Math.round(volume * barsCount)
    return '[' + '■'.repeat(activeBars) + '□'.repeat(barsCount - activeBars) + ']'
  }

  const renderCardBody = (title: string, tempo: string, index: number, palette: string, trackId: string) => (
    <>
      <div className="card-magnetic-stripe" />
      <div className="card-punched-holes">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="punch-hole" />
        ))}
      </div>
      <div className="card-cut-corner" />
      <div className="card-contact-pads">
        <div className="contact-pad" />
        <div className="contact-pad" />
        <div className="contact-pad" />
        <div className="contact-pad" />
      </div>
      <div className="card-chip" />
      <div className="card-title">{title.toUpperCase()}</div>
      <div className="card-art-area">
        {renderCardArtwork(trackId, palette)}
      </div>
      <div className="card-metadata">
        {tempo} BPM<br />
        SECTOR: 0{index + 1}<br />
        STRUDEL_CARD_V1
      </div>
    </>
  )

  return (
    <div className="page-layout">
      {/* Page Header */}
      <header className="page-header" aria-label="Site header">
        <h1 className="page-title">STRUDEL SESSIONS</h1>
        <p className="page-subtitle">dynamic music · live code · pattern synthesis</p>
      </header>

      <main className="terminal-showcase-container">
        {/* Left Organizer Shelf */}
        <section className="card-organizer-shelf" aria-label="Code card library">
          <h2 className="shelf-title">Library Sleeves</h2>
          <div className="library-grid">
            {machine.tracks.map((track, index) => {
              const isCurrentActive = activeCardIndex === index
              return (
                <div key={track.id} className="sleeve-container">
                  {!isCurrentActive && (
                    <button
                      type="button"
                      className="code-card"
                      onClick={() => handleLoadCard(index)}
                      disabled={machine.isLoadingPlayback}
                      aria-label={`Load card ${track.title}`}
                    >
                      {renderCardBody(track.title, track.tempo, index, track.palette, track.id)}
                    </button>
                  )}
                  <div className="card-sleeve-slot" />
                </div>
              )
            })}
          </div>
        </section>

        {/* Center Console Terminal Wrapper */}
        <div
          className="terminal-device-wrapper"
          style={{
            marginBottom: showCode ? '290px' : undefined,
            transition: 'margin-bottom 0.6s cubic-bezier(0.19, 1, 0.22, 1)'
          }}
        >
          {/* Animated Top-Inserting Card */}
          {activeCardIndex !== null && (
            <div className={`inserted-card-container ${!isInserting ? 'slotted' : ''}`}>
              <div className="code-card active-card">
                {renderCardBody(
                  machine.tracks[activeCardIndex].title,
                  machine.tracks[activeCardIndex].tempo,
                  activeCardIndex,
                  machine.tracks[activeCardIndex].palette,
                  machine.tracks[activeCardIndex].id
                )}
              </div>
            </div>
          )}

          {/* Pull-Out Code Screen Drawer (CD Tray style) */}
          <aside className={`live-code-drawer ${showCode ? 'open-drawer' : ''}`} aria-label="Code execution console">
            <h2 className="drawer-header">Compiler Console</h2>
            <div className="code-editor-viewport">
              {machine.cassetteLoaded ? (
                formatCode(machine.source)
              ) : (
                <div style={{ opacity: 0.2 }}>// READER STANDBY // INSERT CARD</div>
              )}
            </div>
          </aside>

          {/* Center Console Terminal Casing */}
          <section className="terminal-device-casing">
          {/* Top-Edge Reader Slot */}
          <div className="terminal-card-slot-bezel">
            <div className={`reader-led ${machine.cassetteLoaded ? 'card-loaded' : ''}`} />
            <div className="terminal-card-slot-opening" />
            <div className={`reader-led ${machine.cassetteLoaded ? 'card-loaded' : ''}`} />
          </div>

        {/* Matte LCD Screen */}
        <div className="terminal-screen-bezel">
          <div className="terminal-matte-screen">
            <header className="screen-header">
              <span>SYSTEM: STRUDEL v0.8</span>
              <span>{machine.status}</span>
            </header>

            <div className="screen-body">
              {machine.cassetteLoaded ? (
                <>
                  <h3 className="screen-track-title">
                    0{machine.activeIndex + 1}. {machine.activeTrack.title}
                  </h3>
                  <canvas
                    ref={canvasRef}
                    className="screen-waveform-canvas"
                    width={380}
                    height={70}
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
                  // CARD READER STANDBY //
                </div>
              )}
            </div>

            <footer className="screen-footer">
              <span>{renderVolumeBar()} {Math.round(volume * 100)}%</span>
              <span>{machine.cassetteLoaded ? machine.elapsedLabel : '00:00:00'}</span>
            </footer>
          </div>
        </div>

        {/* Side-Protruding Selector Dial */}
        <div className="side-dial-bezel">
          <div
            ref={dialRef}
            className="side-dial-wheel"
            onPointerDown={handleDialPointerDown}
            onPointerMove={handleDialPointerMove}
            onPointerUp={handleDialPointerUp}
            onPointerCancel={handleDialPointerUp}
            aria-label="Volume dial wheel"
          >
            {Array.from({ length: 15 }).map((_, idx) => {
              const rotatedOffset = (idx * 9 + dialRotation) % 135
              return (
                <div
                  key={idx}
                  className="dial-ridge"
                  style={{ transform: `translateY(${rotatedOffset - 10}px)` }}
                />
              )
            })}
          </div>
        </div>

        {/* Lower Control Keyboard */}
        <div className="terminal-controls-area">
          <div className="tactile-buttons-row">
            <button
              type="button"
              className="tactile-button"
              disabled={machine.isPlaying || machine.isLoadingPlayback || !machine.cassetteLoaded}
              onClick={() => void machine.togglePlayback()}
              aria-label="Start playback"
            >
              <Play size={16} />
              <span>PLAY</span>
            </button>

            <button
              type="button"
              className="tactile-button"
              disabled={!machine.isPlaying}
              onClick={machine.stop}
              aria-label="Stop playback"
            >
              <Square size={14} />
              <span>STOP</span>
            </button>

            <button
              type="button"
              className="tactile-button"
              disabled={!machine.cassetteLoaded || machine.isLoadingPlayback}
              onClick={handleEjectCard}
              aria-label="Eject card"
            >
              <LogOut size={16} />
              <span>EJECT</span>
            </button>

            <button
              type="button"
              className={`tactile-button ${showCode ? 'active-button' : ''}`}
              onClick={() => setShowCode((prev) => !prev)}
              aria-label="Toggle code console drawer"
            >
              <Code2 size={16} />
              <span>CODE</span>
            </button>
          </div>

          {/* Sockets Panel */}
          <div className="sockets-panel">
            <div className="headphone-socket">
              <div className="headphone-jack-hole" />
              <span className="socket-label">PHONES</span>
            </div>

            <div className="status-indicator-leds">
              <div className={`status-led led-green ${machine.isPlaying ? 'active' : ''}`} />
              <div className={`status-led led-orange ${machine.isLoadingPlayback ? 'active' : ''}`} />
            </div>
          </div>
        </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default VectorTerminalShowcase
