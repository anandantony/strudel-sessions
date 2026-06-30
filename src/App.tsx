import { Suspense, lazy } from 'react'
import './App.css'
import { useTapeMachine } from './useTapeMachine'

const VectorTerminalShowcase = lazy(() => import('./VectorTerminalShowcase'))

function App() {
  const machine = useTapeMachine()

  return (
    <Suspense
      fallback = {
        <main className="showcase-loading">
          <span>Strudel Sessions</span>
          <strong>Loading terminal...</strong>
        </main>
      }
    >
      <VectorTerminalShowcase machine={machine} />
    </Suspense>
  )
}

export default App
