import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { ShopProvider } from './store.jsx';
import './styles.css';

const Router = import.meta.env.VITE_DEMO === 'true' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <React.StrictMode><Router><ShopProvider><App /></ShopProvider></Router></React.StrictMode>
);
