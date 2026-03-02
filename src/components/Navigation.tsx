import { Link, useLocation } from 'react-router-dom';
import { Home, Link as LinkIcon, MonitorPlay, Folder, Image } from 'lucide-react';

export default function Navigation() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Configuración', icon: Home },
        { path: '/groups', label: 'Grupos', icon: Folder },
        { path: '/media', label: 'Multimedios', icon: Image },
        { path: '/devices/register', label: 'Vincular', icon: LinkIcon },
        { path: '/devices', label: 'Dispositivos', icon: MonitorPlay },
    ];

    return (
        <nav className="flex items-center gap-2 overflow-x-auto py-2">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all text-sm whitespace-nowrap border
              ${isActive
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-white/50 text-text-primary hover:bg-white border-transparent hover:border-slate-200'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
