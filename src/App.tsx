import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import DashboardHome from './pages/DashboardHome';
import DeviceRegistration from './pages/DeviceRegistration';
import DeviceList from './pages/DeviceList';
import GroupManagement from './pages/GroupManagement';
import MediaLibrary from './pages/MediaLibrary';
import PlaylistManagement from './pages/PlaylistManagement';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background text-text-primary font-sans">

        <Navigation />

        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/groups" element={<GroupManagement />} />
                <Route path="/devices/register" element={<DeviceRegistration />} />
                <Route path="/devices" element={<DeviceList />} />
                <Route path="/media" element={<MediaLibrary />} />
                <Route path="/playlists" element={<PlaylistManagement />} />
              </Routes>
            </div>
          </main>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;
