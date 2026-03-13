import { useState, useEffect } from 'react';
import { Loader2, Trash2, RefreshCw, Monitor, Smartphone as DeviceIcon, Pencil, X } from 'lucide-react';
import { pb, type Device, type PWAConfig } from '../lib/pocketbase';
import { Link } from 'react-router-dom';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { Building2 } from 'lucide-react';

export default function DeviceList() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [configs, setConfigs] = useState<Record<string, PWAConfig>>({});
    const [groups, setGroups] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const { activeOrganization } = useOrganization();
    const { user, hasPermission } = useAuth();
    
    const canManageContent = hasPermission('manage_content');
    const isSuperadmin = user?.role === 'superadmin';

    const fetchConfigs = async (groupIds: string[]) => {
        if (!activeOrganization) return;
        try {
            const uniqueGroupIds = [...new Set(groupIds)].filter(id => id);
            const configPromises = uniqueGroupIds.map(id =>
                pb.collection('pwa_config').getFirstListItem(`group = "${id}" && organization = "${activeOrganization.id}"`, { expand: 'media,playlist' })
                    .catch(() => null)
            );
            const results = await Promise.all(configPromises);
            const newConfigs: Record<string, PWAConfig> = {};
            results.forEach((res, i) => {
                if (res) newConfigs[uniqueGroupIds[i]] = res as any as PWAConfig;
            });
            setConfigs(prev => ({ ...prev, ...newConfigs }));
        } catch (error) {
            console.error('Error fetching group configs:', error);
        }
    };

    const fetchGroups = async () => {
        if (!activeOrganization) return;
        try {
            const records = await pb.collection('device_groups').getFullList<{ id: string, name: string }>({
                filter: `organization = "${activeOrganization.id}"`
            });
            setGroups(records);
        } catch (err) {
            console.error("Error fetching groups:", err);
        }
    };

    const fetchDevices = async () => {
        if (!activeOrganization) {
            setDevices([]);
            setIsLoading(false);
            return;
        }
        try {
            const records = await pb.collection('devices').getFullList<Device>({
                filter: `is_registered = true && organization = "${activeOrganization.id}"`,
                expand: 'group',
                sort: '-updated',
            });
            setDevices(records);
            const groupIds = records.map(d => d.group);
            fetchConfigs(groupIds);
        } catch (err) {
            console.error("Error fetching devices:", err);
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
                console.debug("Realtime subscription inactive (falling back to polling):", err);
                return null;
            }
        };

        const unregisterPromise = subscribeToUpdates();
        const pollingId = setInterval(fetchDevices, 15000);

        return () => {
            clearInterval(pollingId);
            unregisterPromise.then(unsub => unsub?.()).catch(() => { });
        };
    }, [activeOrganization]);

    const handleUpdateGroup = async (deviceId: string, groupId: string) => {
        setIsUpdating(true);
        try {
            await pb.collection('devices').update(deviceId, { group: groupId });
            setEditingDeviceId(null);
            await fetchDevices();
        } catch (err) {
            console.error("Error updating device group:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to unpair "${name}"?`)) return;

        try {
            await pb.collection('devices').delete(id);
            setDevices(devices.filter(d => d.id !== id));
        } catch (err) {
            console.error("Error deleting device:", err);
        }
    };

    const getContentName = (groupId: string) => {
        const config = configs[groupId];
        if (!config) return 'Idle';
        if (config.content_type === 'playlist') return 'Playlist active';
        if (config.expand?.media) return config.expand.media.name;
        if (config.content_type === 'web_only') return 'Web Content';
        return 'Ready';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Screen Management</h1>
                {isSuperadmin && (
                    <Link
                        to="/devices/register"
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <DeviceIcon className="w-5 h-5" />
                        Pair New Screen
                    </Link>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-500 font-medium">Loading screens...</p>
                </div>
            ) : !activeOrganization ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed text-center">
                    <div className="bg-slate-200 p-6 rounded-3xl mb-4 text-slate-400">
                        <Building2 className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No hay empresa seleccionada</h3>
                    <p className="text-slate-500 mt-2">Por favor, selecciona o crea una empresa en el menú lateral.</p>
                </div>
            ) : devices.length === 0 ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed">
                    <div className="bg-slate-200 p-6 rounded-3xl mb-4">
                        <Monitor className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No screens paired</h3>
                    <p className="text-slate-500 mt-2 mb-8">Pair your first device to start broadcasting content.</p>
                    {isSuperadmin && <Link to="/devices/register" className="btn-primary">Get Started</Link>}
                </div>
            ) : (
                <div className="card-premium overflow-hidden !p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Screen Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Now Playing</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {devices.map((device) => (
                                    <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Online</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800">{device.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{device.id}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingDeviceId === device.id ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg outline-none focus:border-primary transition-all"
                                                        defaultValue={device.group}
                                                        disabled={isUpdating}
                                                        onChange={(e) => handleUpdateGroup(device.id, e.target.value)}
                                                    >
                                                        {groups.map(g => (
                                                            <option key={g.id} value={g.id}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => setEditingDeviceId(null)}
                                                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/edit">
                                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                                                        {device.expand?.group?.name || 'Unassigned'}
                                                    </span>
                                                    {canManageContent && (
                                                        <button
                                                            onClick={() => setEditingDeviceId(device.id)}
                                                            className="p-1.5 opacity-0 group-hover/edit:opacity-100 hover:bg-white hover:shadow-sm hover:text-primary rounded-lg transition-all text-slate-400"
                                                            title="Change group"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {getContentName(device.group)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-slate-400">
                                                <button
                                                    onClick={() => fetchDevices()}
                                                    className="p-2 hover:bg-white hover:text-primary hover:shadow-sm rounded-lg transition-all"
                                                    title="Refresh screen"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                {canManageContent && (
                                                    <button
                                                        onClick={() => handleDelete(device.id, device.name)}
                                                        className="p-2 hover:bg-white hover:text-red-500 hover:shadow-sm rounded-lg transition-all"
                                                        title="Unpair screen"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
