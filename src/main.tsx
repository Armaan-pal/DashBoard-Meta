import React from 'react'
import ReactDOM from 'react-dom/client'
import Footer from './Footer'
import App from './App'
import './styles.css'
// import MainApp from './MainApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* <MainApp/> */}
    <Footer />
  </React.StrictMode>
)