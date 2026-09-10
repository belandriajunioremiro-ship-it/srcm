import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';

// Polyfill para Node.js Buffer que requieren react-pdf y shp-write en el navegador
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
