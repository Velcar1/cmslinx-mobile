import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarClock, Loader2, Edit2 } from 'lucide-react';
import { pb, type PWAConfig } from '../lib/pocketbase';
import { useOrganization } from '../context/OrganizationContext';
import ConfigForm from './ConfigForm';

interface ScheduleManagementProps {
    groupId: string;
}

export default function ScheduleManagement({ groupId }: ScheduleManagementProps) {
    const [schedules, setSchedules] = useState<PWAConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
    const { activeOrganization } = useOrganization();

    const fetchSchedules = async () => {
        if (!activeOrganization) {
            setSchedules([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const records = await pb.collection('pwa_config').getFullList<PWAConfig>({
                filter: `group = "${groupId}" && is_schedule = true && organization = "${activeOrganization.id}"`,
                sort: 'schedule_start',
                expand: 'media,playlist'
            });
            setSchedules(records);
        } catch (error) {
            console.error("Error fetching schedules:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, [groupId, activeOrganization]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta programación?')) return;
        try {
            await pb.collection('pwa_config').delete(id);
            setSchedules(schedules.filter(s => s.id !== id));
        } catch (error) {
            console.error("Error deleting schedule:", error);
            alert("No se pudo eliminar la programación.");
        }
    };

    const handleSaveSuccess = () => {
        setIsCreating(false);
        setEditingConfigId(null);
        fetchSchedules();
    };

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return d.toLocaleString('es-ES', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isCurrentlyActive = (start?: string, end?: string) => {
        if (!start || !end) return false;
        const now = new Date();
        const dStart = new Date(start);
        const dEnd = new Date(end);
        return now >= dStart && now <= dEnd;
    };

    if (isCreating || editingConfigId) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">
                        {editingConfigId ? 'Editar Programación' : 'Nueva Programación'}
                    </h3>
                    <button
                        onClick={() => { setIsCreating(false); setEditingConfigId(null); }}
                        className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl"
                    >
                        Cancelar
                    </button>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
                    <ConfigForm
                        forceGroupId={groupId}
                        isSchedule={true}
                        configToEdit={editingConfigId}
                        onSaveSuccess={handleSaveSuccess}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Programaciones</h3>
                    <p className="text-slate-500 text-sm">Contenido que se muestra temporalmente.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-primary hover:bg-[#D98201] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nueva
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Cargando programaciones...</p>
                </div>
            ) : schedules.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200">
                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <CalendarClock className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="font-bold text-slate-700 text-lg">No hay programaciones</h4>
                    <p className="text-slate-500 text-sm mt-1 mb-6 max-w-sm mx-auto">
                        Crea una programación para mostrar contenido específico durante un periodo de tiempo.
                    </p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="text-primary font-bold hover:underline"
                    >
                        Crear la primera programación &rarr;
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {schedules.map(schedule => {
                        const active = isCurrentlyActive(schedule.schedule_start, schedule.schedule_end);

                        return (
                            <div
                                key={schedule.id}
                                className={`p-5 rounded-2xl border transition-all ${active ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <CalendarClock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-slate-800 capitalize">
                                                    {schedule.name_schedule || schedule.content_type.replace('_', ' ')}
                                                </h5>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                    {schedule.name_schedule ? schedule.content_type.replace('_', ' ') : ''}
                                                </p>
                                                {active && (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                                        Activo Ahora
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-400 text-xs font-bold uppercase">Inicio</p>
                                                <p className="text-slate-700 font-medium">{formatDateTime(schedule.schedule_start)}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-xs font-bold uppercase">Fin</p>
                                                <p className="text-slate-700 font-medium">{formatDateTime(schedule.schedule_end)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingConfigId(schedule.id)}
                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(schedule.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
