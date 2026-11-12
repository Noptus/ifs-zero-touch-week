import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '../styles.css';
import './expenses.css';
import ExpensesPage from './ExpensesPage';

createRoot(document.getElementById('root')!).render(<React.StrictMode><ExpensesPage /></React.StrictMode>);
