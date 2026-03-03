import { Link, useLocation } from 'react-router-dom';
import { MonitorPlay, Folder, Image, List, Settings, LayoutDashboard } from 'lucide-react';

export default function Navigation() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/devices', label: 'Screens', icon: MonitorPlay },
        { path: '/groups', label: 'Groups', icon: Folder },
        { path: '/media', label: 'Media Library', icon: Image },
        { path: '/playlists', label: 'Playlists', icon: List },
    ];

    return (
        <nav className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-slate-300 flex flex-col z-50">
            {/* Logo Section */}
            <div className="p-8 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold tracking-tighter text-white">L1</span>
                    <span className="text-3xl font-bold tracking-tighter flex">
                        <span className="text-primary">N</span>
                        <span className="text-blue-400">X</span>
                    </span>
                </div>
            </div>

            {/* Nav Items */}
            <div className="flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group
                                ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`} />
                            <span className="text-[15px]">{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-white/5">
                <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-[15px]">Settings</span>
                </Link>
            </div>
        </nav>
    );
}
