import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../layout/Root.js';
import { SongsListPage } from '../modules/songs/pages/SongsListPage.js';
import { SongDetailPage } from '../modules/songs/pages/SongDetailPage.js';
import { SongFormPage } from '../modules/songs/pages/SongFormPage.js';
import { LabelsPage } from '../modules/labels/pages/LabelsPage.js';
import { SetlistsPage } from '../modules/setlists/pages/SetlistsPage.js';
import { SetlistDetailPage } from '../modules/setlists/pages/SetlistDetailPage.js';
import { SettingsPage } from '../modules/settings/pages/SettingsPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/songs" replace />,
      },
      {
        path: 'songs',
        element: <SongsListPage />,
      },
      {
        path: 'songs/new',
        element: <SongFormPage />,
      },
      {
        path: 'songs/:id',
        element: <SongDetailPage />,
      },
      {
        path: 'songs/:id/edit',
        element: <SongFormPage />,
      },
      {
        path: 'setlists',
        element: <SetlistsPage />,
      },
      {
        path: 'setlists/:id',
        element: <SetlistDetailPage />,
      },
      {
        path: 'labels',
        element: <LabelsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/songs" replace />,
      },
    ],
  },
]);
