import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { CampaignProvider } from './context/CampaignContext';
import { PaymentProvider } from './context/PaymentContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocialNetworkProvider } from './context/SocialNetworkContext';
import Login from './pages/Login';
import Profile from './pages/Profile';
import NewCampaign from './pages/NewCampaign';
import CampaignEditGeneral from './pages/CampaignEditGeneral';
import CampaignEditMedia from './pages/CampaignEditMedia';
import CampaignEditPrizes from './pages/CampaignEditPrizes';
import CampaignDashboard from './pages/CampaignDashboard';
import CampaignManager from './pages/CampaignManager';
import PaymentMethods from './pages/PaymentMethods';
import CustomizeRaffles from './pages/CustomizeRaffles';
import RafflePage from './pages/RafflePage';
import RedirectToRaffle from './pages/RedirectToRaffle';
import SocialNetworks from './pages/Social';
import PublicHome from './pages/PublicHome';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PaymentProvider>
          <SocialNetworkProvider>
            <CampaignProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<PublicHome />} />
                  <Route path="/marketplace" element={<PublicHome />} />
                  <Route path="/login" element={<Login />} />

                  {/* Protected Routes */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <CampaignDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/pix" element={
                    <ProtectedRoute>
                      <PaymentMethods />
                    </ProtectedRoute>
                  } />
                  <Route path="/social" element={
                    <ProtectedRoute>
                      <SocialNetworks />
                    </ProtectedRoute>
                  } />
                  <Route path="/customize" element={
                    <ProtectedRoute>
                      <CustomizeRaffles />
                    </ProtectedRoute>
                  } />

                  {/* Campaign Routes (Protected) */}
                  <Route path="/campaigns/new" element={
                    <ProtectedRoute>
                      <NewCampaign />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns/:id/setup" element={
                    <ProtectedRoute>
                      <NewCampaign />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns/:id/manage" element={
                    <ProtectedRoute>
                      <CampaignManager />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns/:id/edit" element={
                    <ProtectedRoute>
                      <CampaignEditGeneral />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns/:id/media" element={
                    <ProtectedRoute>
                      <CampaignEditMedia />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns/:id/prizes" element={
                    <ProtectedRoute>
                      <CampaignEditPrizes />
                    </ProtectedRoute>
                  } />

                  {/* Public Routes */}
                  <Route path="/passagens/:slug" element={<RafflePage />} />
                  <Route path="/r/:id" element={<RedirectToRaffle />} />
                </Routes>
              </BrowserRouter>
            </CampaignProvider>
          </SocialNetworkProvider>
        </PaymentProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
