import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, FileVideo, ExternalLink, AlertCircle, CheckCircle2, X, Folder } from 'lucide-react';
import { pb, type PWAConfig } from '../lib/pocketbase';

interface ConfigFormInputs {
    redirect_url: string;
}

interface DeviceGroup {
    id: string;
    name: string;
}

export default function ConfigForm() {
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

    // File upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ConfigFormInputs>();

    // Fetch groups on mount
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const records = await pb.collection('device_groups').getFullList<DeviceGroup>();
                setGroups(records);
                if (records.length > 0) {
                    setSelectedGroup(records[0].id);
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Error fetching groups:", err);
                setIsLoading(false);
            }
        };
        fetchGroups();
    }, []);

    // Fetch config when selectedGroup changes
    useEffect(() => {
        if (!selectedGroup) return;

        const fetchConfig = async () => {
            setIsLoading(true);
            setSaveStatus(null);
            setConfigId(null);
            setSelectedFile(null);

            try {
                const record = await pb.collection('pwa_config').getFirstListItem<PWAConfig>(`group = "${selectedGroup}"`, {
                    sort: '-created',
                });

                if (record) {
                    setConfigId(record.id);
                    reset({
                        redirect_url: record.redirect_url,
                    });

                    if (record.video_url) {
                        const url = pb.files.getURL(record, record.video_url);
                        setCurrentVideoUrl(url);
                    } else {
                        setCurrentVideoUrl(null);
                    }
                } else {
                    reset({ redirect_url: '' });
                    setCurrentVideoUrl(null);
                }
            } catch (err: any) {
                if (err.status === 404) {
                    reset({ redirect_url: '' });
                    setCurrentVideoUrl(null);
                } else if (!err.isAbort) {
                    console.error('Error fetching config:', err);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, [selectedGroup, reset]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
    };

    const onSubmit = async (data: ConfigFormInputs) => {
        if (!selectedGroup) {
            alert("Por favor cree un grupo primero.");
            return;
        }

        setIsSaving(true);
        setSaveStatus(null);

        try {
            const formData = new FormData();
            formData.append('redirect_url', data.redirect_url);
            formData.append('group', selectedGroup);

            if (selectedFile) {
                formData.append('video_url', selectedFile);
            }

            let record;
            if (configId) {
                record = await pb.collection('pwa_config').update(configId, formData);
            } else {
                if (!selectedFile) {
                    throw new Error("Debe seleccionar un video para la configuración inicial del grupo.");
                }
                record = await pb.collection('pwa_config').create(formData);
            }

            setConfigId(record.id);
            setSelectedFile(null);

            if (record.video_url) {
                const url = pb.files.getURL(record, record.video_url);
                setCurrentVideoUrl(url);
            }

            setSaveStatus('success');
        } catch (err) {
            console.error('Error saving config:', err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (groups.length === 0 && !isLoading) {
        return (
            <div className="bg-white/80 p-12 rounded-2xl glass w-full max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
                <Folder className="w-12 h-12 text-slate-300" />
                <h2 className="text-xl font-semibold text-text-primary">No hay grupos configurados</h2>
                <p className="text-slate-500 max-w-sm">
                    Primero debe crear un grupo de pantallas en la sección "Grupos" para poder asignarles contenido.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 relative z-10 text-left">

            <div className="bg-white/80 p-6 rounded-2xl glass flex flex-col sm:flex-row items-center gap-4 border-b-4 border-primary/20">
                <label className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                    <Folder className="w-5 h-5 text-primary" /> Seleccionar Grupo:
                </label>
                <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="flex-1 bg-white border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-4 text-slate-800 transition-all outline-none font-medium text-lg cursor-pointer"
                >
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white/80 p-8 rounded-2xl glass flex flex-col gap-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-slate-500 font-medium">Cargando configuración...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            <div className="flex flex-col gap-4">
                                <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <FileVideo className="w-4 h-4 text-primary" /> Video Publicitario (MP4)
                                </label>

                                <div className="relative group">
                                    <div className={`border-2 border-dashed ${selectedFile ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50'} rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[200px]`}>
                                        {selectedFile ? (
                                            <div className="flex flex-col items-center text-center">
                                                <FileVideo className="w-8 h-8 text-primary mb-2" />
                                                <p className="text-sm font-semibold truncate max-w-[200px]">{selectedFile.name}</p>
                                                <button type="button" onClick={removeSelectedFile} title="Quitar archivo"><X className="w-4 h-4 text-red-500" /></button>
                                            </div>
                                        ) : (currentVideoUrl ? (
                                            <div className="flex flex-col items-center text-center">
                                                <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
                                                <p className="text-sm font-semibold text-green-700">Video configurado</p>
                                                <label className="mt-2 cursor-pointer bg-slate-100 px-3 py-1 rounded text-xs font-bold">
                                                    Cambiar
                                                    <input type="file" className="hidden" accept="video/mp4" onChange={handleFileChange} />
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <FileVideo className="w-10 h-10 text-slate-300 mb-2 mx-auto" />
                                                <p className="text-sm text-slate-500">Seleccionar video</p>
                                                <input type="file" accept="video/mp4" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <label htmlFor="redirect_url" className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4 text-primary" /> URL de Redireccionamiento
                                </label>
                                <input
                                    id="redirect_url"
                                    type="url"
                                    className={`w-full bg-slate-50 border ${errors.redirect_url ? 'border-red-400' : 'border-border'} rounded-xl py-4 px-5 text-slate-800 outline-none`}
                                    {...register("redirect_url", { required: "Campo requerido" })}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
                            <div className="flex-1">
                                {saveStatus === 'success' && <div className="text-green-600 text-sm font-medium">¡Guardado!</div>}
                                {saveStatus === 'error' && <div className="text-red-600 text-sm font-medium">Error al guardar.</div>}
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full sm:w-auto bg-primary text-white py-4 px-10 rounded-xl font-bold flex items-center gap-3 transition-all disabled:opacity-70"
                            >
                                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
