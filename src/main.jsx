import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Attendance from './components/Attendance';
import AttendanceList from './components/AttendanceList'
import Home from './components/Home';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App/>
  </BrowserRouter>
);
