import PdfPreviewer from './components/PdfPreviewer'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF Previewer</h1>
      </header>

      <main className="app-main">
        <PdfPreviewer />
      </main>
    </div>
  )
}

export default App
