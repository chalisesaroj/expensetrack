import React from 'react';
import ReactDOM from 'react-dom/client';
import { BudgetProvider } from './context/BudgetContext';
import App from './App';
import './index.css';

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
