import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import './index.css'
import App from './App.tsx'
import Home from './pages/Home/index.tsx'
import Races from './pages/Races/index.tsx'
import RaceDetail from './pages/RaceDetail/index.tsx'
import Training from './pages/Training/index.tsx'
import GIHeat from './pages/GIHeat/index.tsx'
import Other from './pages/Other/index.tsx'
import StravaCallback from './pages/StravaCallback/index.tsx'

const router = createBrowserRouter([
  // OAuth コールバック — App shell なし
  { path: '/auth/strava/callback', element: <StravaCallback /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true,             element: <Home /> },
      { path: 'races',           element: <Races /> },
      { path: 'races/:raceId',   element: <RaceDetail /> },
      { path: 'training',        element: <Training /> },
      { path: 'conditioning',    element: <GIHeat /> },
      { path: 'other',           element: <Other /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
