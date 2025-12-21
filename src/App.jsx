import PdfPreviewer from './components/PdfPreviewer'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>React Native-Style PDF Previewer</h1>
        <p className="app-description">
          Mobile-optimized PDF preview using the Proxy Tab pattern
        </p>
      </header>

      <main className="app-main">
        <PdfPreviewer />
      </main>

      <footer className="app-footer">
        <p>
          Built with React • Optimized for Mobile Browsers • 
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"> View Source</a>
        </p>
      </footer>
    </div>
  )
}

export default App
