import { useState, useEffect } from 'react';
import { Loader2, Trash2, RefreshCw, Monitor, Smartphone as DeviceIcon, Pencil, X, AlertTriangle } from 'lucide-react';
import { pb, type Device, type PWAConfig } from '../lib/pocketbase';
import { Link } from 'react-router-dom';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Building2 } from 'lucide-react';

export default function DeviceList() {
    const { t, language } = useLanguage();
    const [devices, setDevices] = useState<Device[]>([]);
    const [configs, setConfigs] = useState<Record<string, PWAConfig>>({});
    const [groups, setGroups] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
    const [deleteInput, setDeleteInput] = useState('');
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

    const handleDelete = async (device: Device) => {
        setDeviceToDelete(device);
        setDeleteInput('');
    };

    const confirmDelete = async () => {
        if (!deviceToDelete || deleteInput.toLowerCase() !== 'eliminar') return;

        try {
            await pb.collection('devices').delete(deviceToDelete.id);
            setDevices(devices.filter(d => d.id !== deviceToDelete.id));
            setDeviceToDelete(null);
        } catch (err) {
            console.error("Error deleting device:", err);
            alert("Error al eliminar la pantalla");
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
                <h1 className="text-3xl font-bold text-slate-800">{t('screens.title')}</h1>
                {isSuperadmin && (
                    <Link
                        to="/devices/register"
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <DeviceIcon className="w-5 h-5" />
                        {t('screens.pairNew')}
                    </Link>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-500 font-medium">{t('common.loading')}</p>
                </div>
            ) : !activeOrganization ? (
                <div className="card-premium flex flex-col items-center justify-center py-32 bg-slate-50/50 border-dashed text-center">
                    <div className="bg-slate-200 p-8 rounded-full mb-6 text-slate-400">
                        <Building2 className="w-16 h-16" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">{language === 'es' ? 'Selecciona una empresa' : 'Select a company'}</h2>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                        {language === 'es' 
                            ? 'Por favor, selecciona o crea una empresa en el menú lateral para gestionar tus pantallas.'
                            : 'Please select or create a company in the sidebar menu to manage your screens.'}
                    </p>
                </div>
            ) : devices.length === 0 ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed">
                    <div className="bg-slate-200 p-6 rounded-3xl mb-4">
                        <Monitor className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{language === 'es' ? 'No hay pantallas vinculadas' : 'No screens paired'}</h3>
                    <p className="text-slate-500 mt-2 mb-8">
                        {language === 'es' 
                            ? 'Vincula tu primer dispositivo para empezar a transmitir contenido.'
                            : 'Pair your first device to start broadcasting content.'}
                    </p>
                    {isSuperadmin && <Link to="/devices/register" className="btn-primary">{language === 'es' ? 'Empezar' : 'Get Started'}</Link>}
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
                        {devices.map((device) => (
                            <div key={device.id} className="card-premium group relative flex flex-col gap-5 hover:scale-[1.01]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">{t('common.online')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => fetchDevices()}
                                            className="p-2 bg-slate-50 text-slate-400 hover:text-primary rounded-xl transition-all"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        {canManageContent && (
                                            <button
                                                onClick={() => handleDelete(device)}
                                                className="p-2 bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 leading-tight mb-1">{device.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter opacity-70">ID: {device.id}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('common.groups')}</p>
                                         {editingDeviceId === device.id ? (
                                            <select
                                                autoFocus
                                                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                                defaultValue={device.group}
                                                disabled={isUpdating}
                                                onBlur={() => setEditingDeviceId(null)}
                                                onChange={(e) => handleUpdateGroup(device.id, e.target.value)}
                                            >
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2 group/edit">
                                                <span className="text-xs font-bold text-slate-700">{device.expand?.group?.name || t('common.unassigned')}</span>
                                                {canManageContent && (
                                                    <button onClick={() => setEditingDeviceId(device.id)} className="text-slate-300 hover:text-primary transition-colors">
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('screens.nowPlaying')}</p>
                                        <p className="text-xs font-bold text-primary truncate">{getContentName(device.group)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block card-premium overflow-hidden !p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('common.status')}</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('screens.screenName')}</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('common.groups')}</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('screens.nowPlaying')}</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {devices.map((device) => (
                                        <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">{t('common.online')}</span>
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
                                                            {device.expand?.group?.name || t('common.unassigned')}
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
                                                            onClick={() => handleDelete(device)}
                                                            className="p-2 hover:bg-white hover:text-red-500 hover:shadow-sm rounded-lg transition-all"
                                                            title={t('screens.unpair')}
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
                </>
            )}
            {/* Delete Confirmation Modal */}
            {deviceToDelete && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6 text-red-500">                             <div className="bg-red-50 p-3 rounded-2xl">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold">{t('screens.unpair')}?</h2>
                        </div>
                        
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            {language === 'es' 
                                ? <>Esta acción desvinculará a <span className="font-bold text-slate-800">"{deviceToDelete.name}"</span> y dejará de mostrar contenido inmediatamente.</>
                                : <>This action will unpair <span className="font-bold text-slate-800">"{deviceToDelete.name}"</span> and it will stop displaying content immediately.</>
                            }
                        </p>

                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                                {t('screens.confirmUnpair')}
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                placeholder={language === 'es' ? "Escribe 'eliminar' aquí" : "Type 'eliminar' here"}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold text-center text-lg uppercase tracking-widest text-slate-800"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <button
                                onClick={() => setDeviceToDelete(null)}
                                className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteInput.toLowerCase() !== 'eliminar'}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                            >
                                {t('screens.unpair')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
