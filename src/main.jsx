import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ShopProvider } from './store.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><ShopProvider><App /></ShopProvider></BrowserRouter></React.StrictMode>
);
