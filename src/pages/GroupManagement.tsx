import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Monitor, Loader2, X, Folder, PlayCircle } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import ConfigForm from '../components/ConfigForm';

interface DeviceGroup {
    id: string;
    name: string;
}

export default function GroupManagement() {
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [screenCounts, setScreenCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const fetchGroups = async () => {
        try {
            const records = await pb.collection('device_groups').getFullList<DeviceGroup>({
                sort: '-created',
            });
            setGroups(records);

            // Get screen counts per group
            const screens = await pb.collection('devices').getFullList({ filter: 'is_registered = true' });
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
    }, []);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        setIsCreating(true);
        setStatus(null);
        try {
            await pb.collection('device_groups').create({ name: newGroupName });
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
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    New Group
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-500 font-medium">Loading groups...</p>
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
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Monitor className="w-4 h-4" />
                                    <span>{screenCounts[group.id] || 0} screens assigned</span>
                                </div>
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
                            <button
                                onClick={() => setSelectedGroupId(null)}
                                className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8">
                            <ConfigForm
                                forceGroupId={selectedGroupId}
                                onSaveSuccess={() => setSelectedGroupId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
