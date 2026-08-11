import React from 'react'
import ReactDOM from 'react-dom/client'
import CozyFriendsApp from './CozyFriendsApp'
import AdminDashboard from './AdminDashboard'
import './cozy.css'

const App = window.location.hash === '#admin' ? AdminDashboard : CozyFriendsApp

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
