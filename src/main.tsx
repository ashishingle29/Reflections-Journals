import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and suppress known Google Maps API cross-origin script errors and authentication failures
if (typeof window !== 'undefined') {
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    console.warn(
      '[Google Maps Platform] Authentication failed (RefererNotAllowedMapError). ' +
      'Please authorize ' + window.location.origin + '/* in Google Cloud Console Credentials.'
    );
    window.dispatchEvent(new CustomEvent('gmp-auth-failure'));
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    const isGoogleMapsError =
      (typeof event.filename === 'string' && event.filename.includes('maps.googleapis.com')) ||
      (typeof event.message === 'string' && event.message.includes('RefererNotAllowedMapError')) ||
      (typeof event.message === 'string' && event.message.includes('Google Maps')) ||
      (event.message === 'Script error.' && !!document.querySelector('script[src*="maps.googleapis.com"]'));

    if (isGoogleMapsError) {
      event.preventDefault();
      console.warn('[Reflections Sanctuary] Caught and suppressed Google Maps script error to preserve application stability.');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

