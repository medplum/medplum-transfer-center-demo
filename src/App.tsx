import { ErrorBoundary, Loading, useMedplum, useMedplumProfile } from '@medplum/react';
import { Suspense } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { AssignToRoomPage } from './pages/AssignToRoomPage';
import { CreateLocationPage } from './pages/CreateLocationPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditPractitionerPage } from './pages/EditPractitionerPage';
import { LocationsPage } from './pages/LocationPage';
import { NewPatientPage } from './pages/NewPatientPage';
import { NewPhysicianPage } from './pages/NewPhysicianPage';
import { PhysiciansPage } from './pages/PhysiciansPage';
import { ResourcePage } from './pages/ResourcePage';
import { Root } from './pages/Root';
import { ServiceRequestPage } from './pages/ServiceRequestPage';
import { SignInPage } from './pages/SignInPage';
import { SignOutPage } from './pages/SignOutPage';
import { SupplemenaryQuestionnairePage } from './pages/SupplmentaryQuestionnairePage';
import { TransferPage } from './pages/TransferPage';
import { UnitesPage } from './pages/UnitsPage';
import { ViewQuestionnairePage } from './pages/ViewQuestionnairePage';

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
        { path: 'new-patient/ServiceRequest/:id', element: <SupplemenaryQuestionnairePage /> },
        { path: 'new-patient', element: <NewPatientPage /> },
        { path: 'new-physician', element: <NewPhysicianPage /> },
        // { path: 'laboratory', element: <LaboratoryPage /> },
        // { path: 'radiology', element: <RadiologyPage /> },
        { path: 'units', element: <UnitesPage /> },
        // { path: 'notifications', element: <NotificationsPage /> },
        // { path: 'settings', element: <SettingsPage /> },
        { path: 'Location', element: <LocationsPage /> },
        { path: 'Location/new', element: <CreateLocationPage /> },
        { path: 'Location/:id/new', element: <CreateLocationPage /> },
        { path: 'Location/:id/rooms', element: <LocationsPage /> },
        {
          path: 'physicians',
          element: <PhysiciansPage />,
          children: [
            { path: 'Practitioner/:id/edit', element: <EditPractitionerPage /> },
            { path: 'Practitioner/:id/questionnaire', element: <ViewQuestionnairePage /> },
          ],
        },
        { path: '/:resourceType/:id/*', element: <ResourcePage /> },
        { path: '/ServiceRequest/:id/*', element: <ServiceRequestPage /> },
        { path: '/:resourceType/:id', element: <ResourcePage /> },
        { path: '/:resourceType/:id/_history/:versionId', element: <ResourcePage /> },
      ],
    },
    { path: '/signin', element: <SignInPage /> },
    { path: '/signout', element: <SignOutPage /> },
  ]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
