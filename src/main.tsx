import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import './index.css'
import App from './App.tsx'
import RaceBible from './pages/RaceBible/index.tsx'
import Training from './pages/Training/index.tsx'
import GIHeat from './pages/GIHeat/index.tsx'
import RaceDay from './pages/RaceDay/index.tsx'
import Retro from './pages/Retro/index.tsx'
import StravaCallback from './pages/StravaCallback/index.tsx'

const router = createBrowserRouter([
  // OAuth コールバック — App shell なし、AuthProvider は最上位で済
  { path: '/auth/strava/callback', element: <StravaCallback /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/race-bible" replace /> },
      { path: 'race-bible', element: <RaceBible /> },
      { path: 'training',   element: <Training /> },
      { path: 'gi-heat',    element: <GIHeat /> },
      { path: 'race-day',   element: <RaceDay /> },
      { path: 'retro',      element: <Retro /> },
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
