import { useState } from 'react'
import Gate from './components/Gate.jsx'
import Welcome from './components/Welcome.jsx'

// App decides which "screen" is showing.
// Everyone starts at the Gate; once the Gate calls onEnter, we swap to Welcome.
export default function App() {
  const [entered, setEntered] = useState(false)

  return entered ? <Welcome /> : <Gate onEnter={() => setEntered(true)} />
}
