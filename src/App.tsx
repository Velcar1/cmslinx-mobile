import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import DashboardHome from './pages/DashboardHome';
import DeviceRegistration from './pages/DeviceRegistration';
import DeviceList from './pages/DeviceList';
import GroupManagement from './pages/GroupManagement';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 bg-gradient-brand text-slate-800 pb-16">

        {/* Decorative background shapes */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
          <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px]" />
        </div>

        <header className="w-full bg-white/10 backdrop-blur-md border-b border-white/20 relative z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="https://gtf-sap-repo.s3.us-east-1.amazonaws.com/images/l1nx/logo2-L1NX-azulnaranja%2B(2).png"
                alt="LINX Logo"
                className="h-10 object-contain drop-shadow-sm bg-white p-1 rounded backdrop-blur-md"
              />
              <span className="text-white font-bold tracking-tight text-xl ml-2 hidden sm:block border-l border-white/30 pl-4 py-1">
                Panel de Control
              </span>
            </div>

            <Navigation />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 relative z-10 w-full">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/groups" element={<GroupManagement />} />
            <Route path="/devices/register" element={<DeviceRegistration />} />
            <Route path="/devices" element={<DeviceList />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;
