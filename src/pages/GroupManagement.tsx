import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Folder, AlertCircle, CheckCircle2 } from 'lucide-react';
import { pb } from '../lib/pocketbase';

interface DeviceGroup {
    id: string;
    name: string;
}

export default function GroupManagement() {
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const fetchGroups = async () => {
        try {
            setIsLoading(true);
            const records = await pb.collection('device_groups').getFullList<DeviceGroup>({
                sort: '-created',
            });
            setGroups(records);
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
            setStatus({ type: 'success', message: `Grupo "${newGroupName}" creado con éxito.` });
            fetchGroups();
        } catch (err: any) {
            setStatus({ type: 'error', message: "Error al crear el grupo." });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteGroup = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de borrar el grupo "${name}"? Las pantallas asignadas a este grupo podrían dejar de funcionar correctamente.`)) return;

        try {
            await pb.collection('device_groups').delete(id);
            setGroups(groups.filter(g => g.id !== id));
            setStatus({ type: 'success', message: "Grupo eliminado." });
        } catch (err: any) {
            setStatus({ type: 'error', message: "No se pudo eliminar el grupo. Es posible que tenga dependencias." });
        }
    };

    return (
        <div className="flex flex-col items-center mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
                Gestión de Grupos
            </h1>
            <p className="text-blue-100 max-w-2xl text-lg opacity-90 mx-auto mb-8">
                Cree y administre grupos para segmentar el contenido de sus pantallas.
            </p>

            <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
                {/* Formulario de creación */}
                <div className="bg-white/80 p-6 rounded-2xl glass text-left">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Nuevo Grupo
                    </h2>
                    <form onSubmit={handleCreateGroup} className="flex gap-3">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Ej: Sucursal Norte, Pantallas Lobby..."
                            className="flex-1 bg-slate-50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 transition-all outline-none"
                            disabled={isCreating}
                        />
                        <button
                            type="submit"
                            disabled={isCreating || !newGroupName.trim()}
                            className="bg-primary hover:bg-[#D98201] text-white py-3 px-6 rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear"}
                        </button>
                    </form>
                </div>

                {status && (
                    <div className={`${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} p-4 rounded-xl flex items-center gap-3 border`}>
                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p className="text-sm font-medium">{status.message}</p>
                    </div>
                )}

                {/* Lista de grupos */}
                <div className="bg-white/80 p-6 rounded-2xl glass text-left">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <Folder className="w-5 h-5" /> Grupos Existentes
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : groups.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No hay grupos creados aún.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {groups.map((group) => (
                                <div key={group.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-primary/20 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                            <Folder className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-text-primary">{group.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteGroup(group.id, group.name)}
                                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
