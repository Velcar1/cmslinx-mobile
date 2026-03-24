import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import DashboardHome from './pages/DashboardHome';
import DeviceRegistration from './pages/DeviceRegistration';
import DeviceList from './pages/DeviceList';
import GroupManagement from './pages/GroupManagement';
import MediaLibrary from './pages/MediaLibrary';
import PlaylistManagement from './pages/PlaylistManagement';
import Publish from './pages/Publish';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import PrivateRoute from './components/PrivateRoute';

import { OrganizationProvider } from './context/OrganizationContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

function DashboardLayout() {
    return (
        <div className="flex min-h-screen bg-background text-text-primary font-sans">
            <Navigation />
            <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
                <main className="flex-1 p-4 md:p-8 lg:p-10 pt-20 lg:pt-10 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        <Routes>
                            <Route path="/" element={<DashboardHome />} />
                            <Route path="/groups" element={<GroupManagement />} />
                            <Route path="/devices/register" element={<DeviceRegistration />} />
                            <Route path="/devices" element={<DeviceList />} />
                            <Route path="/media" element={<MediaLibrary />} />
                            <Route path="/playlists" element={<PlaylistManagement />} />
                            <Route path="/publish" element={<Publish />} />
                            <Route path="/users" element={<UserManagement />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
}

function App() {
  return (
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <LanguageProvider>
              <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<PrivateRoute />}>
                      <Route path="/*" element={<DashboardLayout />} />
                  </Route>
              </Routes>
            </LanguageProvider>
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
  );
}

export default App;
