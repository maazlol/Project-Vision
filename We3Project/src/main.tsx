import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import './index.css'
import App from './App.tsx'

console.log("ImpactFeed initializing...");
console.log("Current URL:", window.location.href);

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    // Only create a new root if it hasn't been created yet
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ToastProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </ToastProvider>
      </StrictMode>,
    );
  } catch (e) {
    console.error("Mounting error:", e);
  }
}
