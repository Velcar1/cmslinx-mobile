import { useState, useEffect, useCallback } from 'react';
import { pb, type DeviceHeartbeat } from '../lib/pocketbase';
import { useOrganization } from '../context/OrganizationContext';
import { Activity, Wifi, WifiOff, RefreshCw, Monitor as MonitorIcon, Layers } from 'lucide-react';

interface HeartbeatEntry extends DeviceHeartbeat {
    deviceName?: string;
    groupName?: string;
}

// Helper: returns how many minutes ago a date string was
function minutesAgo(dateStr: string): number {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / 60000);
}

function formatTimestamp(dateStr: string): string {
    return new Date(dateStr).toLocaleString(undefined, {
        month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

export default function Monitor() {
    const { activeOrganization } = useOrganization();
    const [heartbeats, setHeartbeats] = useState<HeartbeatEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    const fetchHeartbeats = useCallback(async () => {
        if (!activeOrganization) {
            setHeartbeats([]);
            setIsLoading(false);
            return;
        }
        try {
            const records = await pb.collection('device_heartbeats').getFullList<DeviceHeartbeat>({
                filter: `organization = "${activeOrganization.id}"`,
                sort: '-created',
                expand: 'device,group',
                perPage: 200,
            });

            const enriched = records.map(r => ({
                ...r,
                deviceName: (r.expand?.device as any)?.name ?? r.device,
                groupName: (r.expand?.group as any)?.name ?? r.group,
            }));

            setHeartbeats(enriched);
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('[Monitor] Error fetching heartbeats:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeOrganization]);

    useEffect(() => {
        setIsLoading(true);
        fetchHeartbeats();

        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchHeartbeats, 60000);
        return () => clearInterval(interval);
    }, [fetchHeartbeats]);

    // ── Per-device summary: last heartbeat and online status ──
    const deviceSummary = heartbeats.reduce<Record<string, HeartbeatEntry>>((acc, hb) => {
        if (!acc[hb.device] || new Date(hb.created!) > new Date(acc[hb.device].created!)) {
            acc[hb.device] = hb;
        }
        return acc;
    }, {});

    const summaryList = Object.values(deviceSummary);

    // Extract unique groups for filter
    const uniqueGroups = Array.from(new Set(summaryList.map(d => JSON.stringify({ id: d.group, name: d.groupName }))))
        .map(s => JSON.parse(s) as { id: string, name: string })
        .sort((a, b) => a.name.localeCompare(b.name));

    // Filter logic
    let filteredSummaryList = summaryList;
    if (selectedGroupId) {
        filteredSummaryList = filteredSummaryList.filter(d => d.group === selectedGroupId);
    }
    if (selectedDeviceId) {
        filteredSummaryList = filteredSummaryList.filter(d => d.device === selectedDeviceId);
    }

    let filteredHeartbeats = heartbeats;
    if (selectedGroupId) {
        filteredHeartbeats = filteredHeartbeats.filter(hb => hb.group === selectedGroupId);
    }
    if (selectedDeviceId) {
        filteredHeartbeats = filteredHeartbeats.filter(hb => hb.device === selectedDeviceId);
    }

    const onlineCount = filteredSummaryList.filter(d => minutesAgo(d.created!) <= 15).length;
    const offlineCount = filteredSummaryList.length - onlineCount;

    // (Removed redundant Filter logic block)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl">
                            <Activity className="w-7 h-7 text-primary" />
                        </div>
                        Monitoreo
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        {lastRefreshed ? `Última actualización: ${lastRefreshed.toLocaleTimeString()}` : 'Cargando...'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Group Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <Layers className="w-4 h-4 text-slate-400" />
                        <select 
                            value={selectedGroupId}
                            onChange={(e) => {
                                setSelectedGroupId(e.target.value);
                                setSelectedDeviceId(''); // Reset device filter when group changes
                            }}
                            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none min-w-[150px]"
                        >
                            <option value="">Todos los grupos</option>
                            {uniqueGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name || 'Sin grupo'}</option>
                            ))}
                        </select>
                    </div>

                    {/* Device Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <MonitorIcon className="w-4 h-4 text-slate-400" />
                        <select 
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none min-w-[150px]"
                        >
                            <option value="">Todas las pantallas</option>
                            {(selectedGroupId ? summaryList.filter(d => d.group === selectedGroupId) : summaryList).map(d => (
                                <option key={d.device} value={d.device}>{d.deviceName}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchHeartbeats}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl text-sm font-medium text-primary transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <MonitorIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Pantallas</p>
                        <p className="text-2xl font-black text-slate-900">{filteredSummaryList.length}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <Wifi className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Online</p>
                        <p className="text-2xl font-black text-emerald-400">{onlineCount}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-rose-500/10 rounded-xl">
                        <WifiOff className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Offline</p>
                        <p className="text-2xl font-black text-rose-400">{offlineCount}</p>
                    </div>
                </div>
            </div>

            {/* Device Status Grid */}
            {filteredSummaryList.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 uppercase tracking-wide text-xs">Estado de Pantallas</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredSummaryList.map(device => {
                            const ago = minutesAgo(device.created!);
                            const isOnline = ago <= 15;
                            return (
                                <div key={device.device} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                                    <div className={`w-3 h-3 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.4)]' : 'bg-rose-400'}`} />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-slate-800 text-sm truncate">{device.deviceName}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate font-medium">
                                            <Layers className="w-3 h-3 shrink-0" />{device.groupName}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-xs font-bold uppercase ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isOnline ? 'Online' : 'Offline'}
                                        </p>
                                        <p className="text-[10px] text-slate-500">{ago}m atrás</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-3 uppercase tracking-wide text-xs">Historial de Actividad</h2>
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mr-3" />Cargando...
                    </div>
                ) : !activeOrganization ? (
                    <div className="text-center py-20 text-slate-500">Selecciona una empresa para ver el historial.</div>
                ) : heartbeats.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        No hay registros de heartbeat aún.
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-200" />
                        <div className="space-y-3">
                            {filteredHeartbeats.map((hb, i) => {
                                const ago = minutesAgo(hb.created!);
                                const isOnline = hb.status === 'online';
                                return (
                                    <div key={hb.id} className="flex items-start gap-4 pl-10 relative">
                                        {/* Dot */}
                                        <div className={`absolute left-0 top-3 w-9 h-9 rounded-full flex items-center justify-center border-2 ${isOnline ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-rose-400/50 bg-rose-400/10'}`}>
                                            {isOnline
                                                ? <Wifi className="w-4 h-4 text-emerald-400" />
                                                : <WifiOff className="w-4 h-4 text-rose-400" />
                                            }
                                        </div>
                                        {/* Card */}
                                        <div className={`flex-1 bg-white border shadow-sm rounded-xl px-4 py-3 ${i === 0 ? 'border-primary/30' : 'border-slate-200'}`}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <span className="font-bold text-slate-800 text-sm">{hb.deviceName}</span>
                                                    <span className="mx-2 text-slate-400 opacity-50">·</span>
                                                    <span className="text-xs text-slate-500 font-medium">{hb.groupName}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
                                                        {hb.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1">{formatTimestamp(hb.created!)} — hace {ago} min</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
