import { useState, useEffect } from 'react';
import { Loader2, MonitorPlay, Trash2, Smartphone, Signal, Folder, Edit2, X } from 'lucide-react';
import { pb } from '../lib/pocketbase';

interface Device {
    id: string;
    name: string;
    pairing_code: string;
    is_registered: boolean;
    group: string;
    expand?: {
        group?: {
            name: string;
        }
    }
}

interface DeviceGroup {
    id: string;
    name: string;
}

export default function DeviceList() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const fetchDevices = async () => {
        try {
            const records = await pb.collection('devices').getFullList<Device>({
                filter: 'is_registered = true',
                expand: 'group',
                sort: '-updated',
            });
            setDevices(records);
        } catch (err) {
            console.error("Error fetching devices:", err);
        }
    };

    const fetchGroups = async () => {
        try {
            const records = await pb.collection('device_groups').getFullList<DeviceGroup>();
            setGroups(records);
        } catch (err) {
            console.error("Error fetching groups:", err);
        }
    };

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchDevices(), fetchGroups()]);
            setIsLoading(false);
        };
        init();

        const subscribeToUpdates = async () => {
            try {
                return await pb.collection('devices').subscribe('*', () => {
                    fetchDevices();
                });
            } catch (err) {
                // Subtle log instead of warn as we have the polling fallback
                console.debug("Realtime subscription inactive (falling back to polling):", err);
                return null;
            }
        };

        const unsubscribePromise = subscribeToUpdates();

        // 3. Fallback: Polling every 10 seconds for robustness
        const pollingId = setInterval(() => {
            fetchDevices();
        }, 10000);

        return () => {
            clearInterval(pollingId);
            unsubscribePromise.then(unsub => {
                if (unsub) unsub();
            }).catch(() => { }); // Ignore unsubscribe errors
        };
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de desvincular "${name}"?`)) return;

        try {
            await pb.collection('devices').delete(id);
            setDevices(devices.filter(d => d.id !== id));
        } catch (err) {
            console.error("Error deleting device:", err);
        }
    };

    const handleGroupChange = async (deviceId: string, newGroupId: string) => {
        setIsUpdating(deviceId);
        try {
            await pb.collection('devices').update(deviceId, {
                group: newGroupId
            });
            setEditingDeviceId(null);
            fetchDevices(); // Refresh to get expanded group name
        } catch (err) {
            console.error("Error updating device group:", err);
            alert("Error al actualizar el grupo.");
        } finally {
            setIsUpdating(null);
        }
    };

    return (
        <div className="flex flex-col items-center mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full text-left">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-md text-center">Dispositivos Conectados</h1>
            <p className="text-blue-100 mb-10 text-center opacity-90">Gestione sus pantallas activas y asigne grupos de contenido.</p>

            {isLoading ? (
                <Loader2 className="w-12 h-12 text-white animate-spin mx-auto" />
            ) : devices.length === 0 ? (
                <div className="bg-white/10 p-12 rounded-3xl max-w-md w-full text-center">
                    <Smartphone className="w-16 h-16 text-white/30 mx-auto mb-4" />
                    <h2 className="text-white text-xl font-semibold">No hay dispositivos</h2>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
                    {devices.map((device) => (
                        <div key={device.id} className="bg-white/90 p-6 rounded-2xl glass flex flex-col gap-4 relative transition-all hover:scale-[1.02] text-left">
                            <div className="flex justify-between items-start">
                                <div className="bg-primary/10 p-3 rounded-xl text-primary"><MonitorPlay className="w-6 h-6" /></div>
                                <div className="flex items-center gap-1.5 text-green-500 bg-green-50 px-2 py-1 rounded-full border border-green-100 text-[10px] font-bold tracking-wider">ONLINE</div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{device.name}</h3>
                                <p className="text-[10px] text-slate-400 font-mono italic mt-1">ID: {device.id}</p>
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 text-sm">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 flex items-center gap-1"><Folder className="w-3.5 h-3.5" /> Grupo:</span>
                                    {editingDeviceId === device.id ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                autoFocus
                                                disabled={isUpdating === device.id}
                                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary"
                                                defaultValue={device.group}
                                                onChange={(e) => handleGroupChange(device.id, e.target.value)}
                                            >
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => setEditingDeviceId(null)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group/btn">
                                            <span className="font-semibold text-primary">{device.expand?.group?.name || 'Sin Grupo'}</span>
                                            <button
                                                onClick={() => setEditingDeviceId(device.id)}
                                                className="opacity-0 group-hover/btn:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded text-slate-400"
                                                title="Cambiar grupo"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-slate-500 flex items-center gap-1"><Signal className="w-3.5 h-3.5" /> Calidad de Red:</span>
                                    <span className="font-semibold text-slate-700">Excelente</span>
                                </div>
                            </div>

                            <button onClick={() => handleDelete(device.id, device.name)} className="mt-2 py-2.5 rounded-xl border border-red-100 text-red-500 font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                                <Trash2 className="w-4 h-4" /> Desvincular Pantalla
                            </button>

                            {isUpdating === device.id && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-20">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
