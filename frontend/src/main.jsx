// ============================================================
// main.jsx — React app entry point
// Wraps the app in BrowserRouter so we can use React Router
// for navigation between pages (login, register, dashboard).
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);