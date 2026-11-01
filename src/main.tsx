import React from 'react';
import ReactDOM from 'react-dom/client';
import { BudgetProvider } from './context/BudgetContext';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker immediately for offline support & installability
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BudgetProvider>
        <App />
      </BudgetProvider>
    </React.StrictMode>
  );
}
