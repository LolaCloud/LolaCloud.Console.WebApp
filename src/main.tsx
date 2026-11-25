import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import '@cloudscape-design/global-styles/index.css';
import './index.css';
import App from './App.tsx';

// Initialize Cloudscape theme: default to Dark Mode, persisted in localStorage
const initialTheme = (localStorage.getItem('lola_theme') as 'dark' | 'light') || 'dark';
applyMode(initialTheme === 'dark' ? Mode.Dark : Mode.Light);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
