import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Monitor, Loader2, X, Folder, PlayCircle, Smartphone, CalendarClock, LayoutGrid } from 'lucide-react';
import { pb, type Device, type DeviceGroup } from '../lib/pocketbase';
import ConfigForm from '../components/ConfigForm';
import ScheduleManagement from '../components/ScheduleManagement';
import { useOrganization } from '../context/OrganizationContext';
import { Building2 } from 'lucide-react';



export default function GroupManagement() {
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [screenCounts, setScreenCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'base' | 'schedules'>('base');
    const [viewingScreensGroup, setViewingScreensGroup] = useState<DeviceGroup | null>(null);
    const [groupScreens, setGroupScreens] = useState<Device[]>([]);
    const [isLoadingScreens, setIsLoadingScreens] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const { activeOrganization } = useOrganization();

    const fetchGroups = async () => {
        if (!activeOrganization) {
            setGroups([]);
            setScreenCounts({});
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const records = await pb.collection('device_groups').getFullList<DeviceGroup>({
                sort: '-created',
                filter: `organization = "${activeOrganization.id}"`,
            });
            setGroups(records);

            // Get screen counts per group
            const screens = await pb.collection('devices').getFullList({ 
                filter: `is_registered = true && organization = "${activeOrganization.id}"` 
            });
            const counts: Record<string, number> = {};
            screens.forEach(s => {
                if (s.group) counts[s.group] = (counts[s.group] || 0) + 1;
            });
            setScreenCounts(counts);
        } catch (err: any) {
            console.error("Error fetching groups:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [activeOrganization]);

    const handleViewScreens = async (group: DeviceGroup) => {
        setViewingScreensGroup(group);
        setIsLoadingScreens(true);
        try {
            const records = await pb.collection('devices').getFullList<Device>({
                filter: `group = "${group.id}" && organization = "${activeOrganization?.id}"`,
                sort: 'name'
            });
            setGroupScreens(records);
        } catch (err) {
            console.error("Error fetching group screens:", err);
        } finally {
            setIsLoadingScreens(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        setIsCreating(true);
        setStatus(null);
        try {
            if (!activeOrganization) throw new Error("No organization selected");
            await pb.collection('device_groups').create({ 
                name: newGroupName,
                organization: activeOrganization.id
            });
            setNewGroupName('');
            setShowCreateModal(false);
            fetchGroups();
        } catch (err: any) {
            setStatus({ type: 'error', message: "Error creating group." });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? Registered screens in this group may stop working correctly.`)) return;

        try {
            await pb.collection('device_groups').delete(id);
            setGroups(groups.filter(g => g.id !== id));
        } catch (err: any) {
            alert("Could not delete group. It may have dependencies.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Display Groups</h1>
                    <p className="text-slate-500 mt-1">Organize your screens and push content updates.</p>
                </div>
                {activeOrganization && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Group
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-500 font-medium tracking-wide">Cargando grupos...</p>
                </div>
            ) : !activeOrganization ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed text-center">
                    <div className="bg-slate-200 p-6 rounded-3xl mb-4 text-slate-400">
                        <Building2 className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No hay empresa seleccionada</h3>
                    <p className="text-slate-500 mt-2">Por favor, selecciona o crea una empresa en el menú lateral.</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed">
                    <div className="bg-slate-200 p-6 rounded-3xl mb-4">
                        <Folder className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No groups found</h3>
                    <p className="text-slate-500 mt-2 mb-8">Create a group to start organizing your content.</p>
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary">Create First Group</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((group) => (
                        <div key={group.id} className="card-premium group relative flex flex-col gap-6">
                            <div className="flex justify-between items-start">
                                <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Folder className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                    <button
                                        onClick={() => setSelectedGroupId(group.id)}
                                        className="p-2 hover:text-primary transition-colors"
                                        title="Configure Group"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGroup(group.id, group.name)}
                                        className="p-2 hover:text-red-500 transition-colors"
                                        title="Delete Group"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-1">{group.name}</h3>
                                <button
                                    onClick={() => handleViewScreens(group)}
                                    className="flex items-center gap-2 text-slate-400 text-sm hover:text-primary transition-colors group/count"
                                >
                                    <Monitor className="w-4 h-4 group-hover/count:scale-110 transition-transform" />
                                    <span className="hover:underline decoration-primary/30 underline-offset-4">{screenCounts[group.id] || 0} screens assigned</span>
                                </button>
                            </div>

                            <div className="pt-6 border-t border-slate-50 mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                                    <PlayCircle className="w-4 h-4" />
                                    <span>Active Content</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">New Group</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="space-y-6">
                            {status && (
                                <div className={`p-4 rounded-xl text-sm font-bold ${status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {status.message}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Group Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Lobby Entrance, Floor 2..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isCreating || !newGroupName.trim()}
                                className="w-full btn-primary flex justify-center py-4"
                            >
                                {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Group"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Group Configuration Overlay */}
            {selectedGroupId && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-end">
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Group Settings</h2>
                                <p className="text-slate-500 font-medium">
                                    {groups.find(g => g.id === selectedGroupId)?.name}
                                </p>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-2xl mr-4 border border-slate-200 shadow-inner">
                                <button
                                    onClick={() => setActiveTab('base')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'base' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" /> Base
                                </button>
                                <button
                                    onClick={() => setActiveTab('schedules')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'schedules' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <CalendarClock className="w-4 h-4" /> Programación
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedGroupId(null)}
                                className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8">
                            {activeTab === 'base' ? (
                                <ConfigForm
                                    forceGroupId={selectedGroupId}
                                    isSchedule={false}
                                    onSaveSuccess={() => { /* Opción de cerrar o mantener abierto */ }}
                                />
                            ) : (
                                <ScheduleManagement groupId={selectedGroupId} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Viewing Screens Modal */}
            {viewingScreensGroup && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-xl">
                                    <Monitor className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">Assigned Screens</h2>
                                    <p className="text-slate-500 font-medium">{viewingScreensGroup.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingScreensGroup(null)}
                                className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {isLoadingScreens ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                    <p className="text-slate-500 font-medium tracking-wide">Fetching assigned screens...</p>
                                </div>
                            ) : groupScreens.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Smartphone className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="font-bold text-slate-800 text-lg">No screens assigned</p>
                                    <p className="text-slate-500 mt-1">This group doesn't have any registered screens yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 pb-4">
                                    {groupScreens.map((screen) => (
                                        <div key={screen.id} className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between group/item hover:bg-slate-100 transition-colors border border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${screen.is_registered ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    <Smartphone className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 leading-tight">{screen.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${screen.is_registered ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                            {screen.is_registered ? 'Registered' : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pairing Code</span>
                                                <code className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-sm font-mono font-bold text-primary">
                                                    {screen.pairing_code}
                                                </code>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-50">
                            <button
                                onClick={() => setViewingScreensGroup(null)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg"
                            >
                                Close List
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
