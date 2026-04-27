// frontend/src/App.js
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import { useAuth } from './contexts/AuthContext.jsx';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('./pages/Auth/VerifyEmailPage.jsx'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage.jsx'));
const AdminPage = lazy(() => import('./pages/Admin/AdminPage.jsx'));
const UnauthorizedPage = lazy(() => import('./pages/Status/UnauthorizedPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/Status/NotFoundPage.jsx'));
const ContactUsPage = lazy(() => import('./pages/ContactUs/ContactUsPage.jsx'));
const PropertyListingPage = lazy(() => import('./pages/Property/PropertyListingPage.jsx'));
const PropertyDetailsPage = lazy(() => import('./pages/Property/PropertyDetailsPage.jsx'));
const AddPropertyPage = lazy(() => import('./pages/Property/AddPropertyPage.jsx'));
const PropertyIntelligenceReportPage = lazy(() => import('./pages/Property/PropertyIntelligenceReportPage.jsx'));

const LoadingFallback = () => <div style={{ textAlign: 'center', color: 'var(--color-text-primary)', marginTop: '60px', fontSize: '1.5rem' }}>Loading Page...</div>;

function App() {
  const { isLoading: isAuthContextLoading } = useAuth();

  if (isAuthContextLoading) { // Prevents route rendering before auth state is known
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/contact" element={<ContactUsPage />} />
          <Route path="/properties" element={<PropertyListingPage />} />
          <Route path="/properties/:id" element={<PropertyDetailsPage />} />


          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} /> {/* Dashboard is protected */}
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Landlord', 'Admin']} />}>
            <Route path="/add-property" element={<AddPropertyPage />} />
            <Route path="/properties/:id/edit" element={<AddPropertyPage />} />
            <Route path="/properties/:id/intelligence-report" element={<PropertyIntelligenceReportPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
export default App;