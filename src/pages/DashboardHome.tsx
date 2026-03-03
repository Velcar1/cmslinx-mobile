import { useState, useEffect } from 'react';
import { Monitor, Wifi, Layers, Image } from 'lucide-react';
import { pb } from '../lib/pocketbase';

export default function DashboardHome() {
    const [stats, setStats] = useState({
        totalScreens: 0,
        onlineScreens: 0,
        displayGroups: 0,
        totalMedia: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [screens, groups, media] = await Promise.all([
                    pb.collection('devices').getList(1, 1),
                    pb.collection('device_groups').getList(1, 1),
                    pb.collection('media').getList(1, 1),
                ]);

                setStats({
                    totalScreens: screens.totalItems,
                    onlineScreens: screens.totalItems, // Mock online for now
                    displayGroups: groups.totalItems,
                    totalMedia: media.totalItems
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Overview</h1>
                <p className="text-slate-500 text-lg">Your L1NX system status at a glance.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                    { label: 'Total Screens', value: stats.totalScreens, icon: Monitor, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Online Screens', value: stats.onlineScreens, icon: Wifi, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Display Groups', value: stats.displayGroups, icon: Layers, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Total Media Assets', value: stats.totalMedia, icon: Image, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                ].map((stat, i) => (
                    <div key={i} className="card-premium group p-8 flex flex-col gap-6 hover:scale-[1.02] transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                                <stat.icon className="w-8 h-8" />
                            </div>
                            <span className="bg-slate-50 text-slate-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Live System</span>
                        </div>
                        <div>
                            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-5xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
                        </div>
                        <div className="pt-6 border-t border-slate-50 mt-auto flex items-center justify-between text-slate-400 text-xs font-medium">
                            <span>Last updated: just now</span>
                            <div className="flex gap-1">
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
