import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeLanguageProvider } from './lib/ThemeLanguageContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeLanguageProvider>
      <App />
    </ThemeLanguageProvider>
  </StrictMode>,
);

