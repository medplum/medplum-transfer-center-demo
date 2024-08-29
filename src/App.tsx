import { ErrorBoundary, Loading, useMedplum, useMedplumProfile } from '@medplum/react';
// import { IconUser } from '@tabler/icons-react';
import { Suspense } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { AssignToRoomPage } from './pages/AssignToRoomPage';
import { DashboardPage } from './pages/DashboardPage';
import { LaboratoryPage } from './pages/LaboratoryPage';
import { LocationsPage } from './pages/LocationPage';
import { NewPatientPage } from './pages/NewPatientPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { RadiologyPage } from './pages/RadiologyPage';
import { Root } from './pages/Root';
import { SettingsPage } from './pages/SettingsPage';
import { SignInPage } from './pages/SignInPage';
import { SignOutPage } from './pages/SignOutPage';
import { TransferPage } from './pages/TransferPage';
import { UnitesPage } from './pages/UnitsPage';

function App(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();

  if (medplum.isLoading()) {
    return null;
  }

  const router = createBrowserRouter([
    {
      path: '/',
      element: profile ? <Root /> : <Navigate to="/signin" replace />,
      children: [
        { index: true, element: <Navigate to="/dashboard" /> },
        {
          path: 'dashboard',
          element: <DashboardPage />,
          children: [{ path: 'ServiceRequest/:id', element: <AssignToRoomPage /> }],
        },
        { path: 'transfers', element: <TransferPage /> },
        { path: 'new-patient', element: <NewPatientPage /> },
        { path: 'laboratory', element: <LaboratoryPage /> },
        { path: 'radiology', element: <RadiologyPage /> },
        { path: 'units', element: <UnitesPage /> },
        { path: 'notifications', element: <NotificationsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'locations', element: <LocationsPage /> },
      ],
    },
    { path: '/signin', element: <SignInPage /> },
    { path: '/signout', element: <SignOutPage /> },
    // { path: '/', element: profile ? <Navigate to="/dashboard" /> : <Navigate to="/signin" /> },
  ]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
        {/* <Routes>
          <Route path="/" element={profile ? <Navigate to="/dashboard" /> : <Navigate to="/signin" replace />} />

          <Route path="dashboard" element={profile ? <DashboardPage /> : <Navigate to="/signin" />}>
            <Route index element={<MainPage />} />
            <Route path="transfers" element={<TransferPage />} />
            <Route path="units" element={<UnitesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="locations" element={<LocationsPage />} />
          </Route>

          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signout" element={<SignOutPage />} />
        </Routes> */}
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
