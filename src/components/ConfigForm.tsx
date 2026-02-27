import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, FileVideo, CheckCircle2, Folder, Image as ImageIcon, Globe, Tv, MonitorPlay } from 'lucide-react';
import { pb, type PWAConfig } from '../lib/pocketbase';

type ContentType = 'video_interactive' | 'video_only' | 'image_only' | 'web_only';

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

    // Content Type state
    const [contentType, setContentType] = useState<ContentType>('video_interactive');

    // File upload state for video
    const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

    // File upload state for image
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

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
            setSelectedVideoFile(null);
            setSelectedImageFile(null);

            try {
                const record = await pb.collection('pwa_config').getFirstListItem<PWAConfig>(`group = "${selectedGroup}"`, {
                    sort: '-created',
                });

                if (record) {
                    setConfigId(record.id);
                    setContentType(record.content_type || 'video_interactive');
                    reset({
                        redirect_url: record.redirect_url,
                    });

                    if (record.video_url) {
                        const url = pb.files.getURL(record, record.video_url);
                        setCurrentVideoUrl(url);
                    } else {
                        setCurrentVideoUrl(null);
                    }

                    if (record.image_url) {
                        const url = pb.files.getURL(record, record.image_url);
                        setCurrentImageUrl(url);
                    } else {
                        setCurrentImageUrl(null);
                    }
                } else {
                    reset({ redirect_url: '' });
                    setCurrentVideoUrl(null);
                    setCurrentImageUrl(null);
                    setContentType('video_interactive');
                }
            } catch (err: any) {
                if (err.status === 404) {
                    reset({ redirect_url: '' });
                    setCurrentVideoUrl(null);
                    setCurrentImageUrl(null);
                    setContentType('video_interactive');
                } else if (!err.isAbort) {
                    console.error('Error fetching config:', err);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, [selectedGroup, reset]);

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedVideoFile(e.target.files[0]);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImageFile(e.target.files[0]);
        }
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
            formData.append('content_type', contentType);
            formData.append('group', selectedGroup);

            // Required fields validation based on type
            if ((contentType === 'video_interactive' || contentType === 'video_only') && !selectedVideoFile && !currentVideoUrl) {
                throw new Error("Debe subir un video para este tipo de contenido.");
            }
            if (contentType === 'image_only' && !selectedImageFile && !currentImageUrl) {
                throw new Error("Debe subir una imagen para este tipo de contenido.");
            }
            if ((contentType === 'video_interactive' || contentType === 'web_only') && !data.redirect_url) {
                throw new Error("URL requerida para este tipo de contenido.");
            }

            formData.append('redirect_url', data.redirect_url);

            if (selectedVideoFile) {
                formData.append('video_url', selectedVideoFile);
            }
            if (selectedImageFile) {
                formData.append('image_url', selectedImageFile);
            }

            let record;
            if (configId) {
                record = await pb.collection('pwa_config').update(configId, formData);
            } else {
                record = await pb.collection('pwa_config').create(formData);
            }

            setConfigId(record.id);
            setSelectedVideoFile(null);
            setSelectedImageFile(null);

            if (record.video_url) {
                setCurrentVideoUrl(pb.files.getURL(record, record.video_url));
            }
            if (record.image_url) {
                setCurrentImageUrl(pb.files.getURL(record, record.image_url));
            }

            setSaveStatus('success');
        } catch (err: any) {
            console.error('Error saving config:', err);
            alert(err.message || "Error al guardar la configuración.");
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

    const contentTypes: { id: ContentType, label: string, icon: any, desc: string }[] = [
        { id: 'video_interactive', label: 'Video Interactivo', icon: MonitorPlay, desc: 'Video en loop que abre una web al tocar' },
        { id: 'video_only', label: 'Solo Video', icon: Tv, desc: 'Video en loop sin interacción' },
        { id: 'image_only', label: 'Solo Imagen', icon: ImageIcon, desc: 'Imagen fija en pantalla completa' },
        { id: 'web_only', label: 'Solo Web', icon: Globe, desc: 'Carga una página web directamente' },
    ];

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
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                        {/* Selector de Tipo de Contenido */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                                <Tv className="w-4 h-4 text-primary" /> Tipo de Contenido
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {contentTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setContentType(type.id)}
                                        className={`flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all duration-300 ${contentType === type.id
                                            ? 'border-primary bg-primary/5 shadow-lg scale-105'
                                            : 'border-slate-100 hover:border-primary/30 bg-slate-50/50'
                                            }`}
                                    >
                                        <type.icon className={`w-8 h-8 mb-3 ${contentType === type.id ? 'text-primary' : 'text-slate-400'}`} />
                                        <span className={`text-sm font-bold block ${contentType === type.id ? 'text-primary' : 'text-slate-600'}`}>{type.label}</span>
                                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">{type.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">

                            {/* Campo de Video */}
                            {(contentType === 'video_interactive' || contentType === 'video_only') && (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4">
                                    <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                        <FileVideo className="w-4 h-4 text-primary" /> Video (MP4)
                                    </label>
                                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 min-h-[180px]">
                                        {selectedVideoFile ? (
                                            <div className="text-center">
                                                <div className="bg-primary/10 p-2 rounded-lg inline-block mb-2"><FileVideo className="w-6 h-6 text-primary" /></div>
                                                <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{selectedVideoFile.name}</p>
                                                <button type="button" onClick={() => setSelectedVideoFile(null)} className="text-[10px] text-red-500 font-bold mt-1">Quitar</button>
                                            </div>
                                        ) : currentVideoUrl ? (
                                            <div className="text-center">
                                                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                                <p className="text-xs font-bold text-green-700">Video guardado</p>
                                                <p className="text-[10px] text-slate-400">Click para cambiar</p>
                                                <input type="file" accept="video/mp4" onChange={handleVideoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <FileVideo className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                                                <p className="text-xs text-slate-500">Seleccionar MP4</p>
                                                <input type="file" accept="video/mp4" onChange={handleVideoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Campo de Imagen */}
                            {contentType === 'image_only' && (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4">
                                    <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-primary" /> Imagen
                                    </label>
                                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 min-h-[180px]">
                                        {selectedImageFile ? (
                                            <div className="text-center">
                                                <div className="bg-primary/10 p-2 rounded-lg inline-block mb-2"><ImageIcon className="w-6 h-6 text-primary" /></div>
                                                <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{selectedImageFile.name}</p>
                                                <button type="button" onClick={() => setSelectedImageFile(null)} className="text-[10px] text-red-500 font-bold mt-1">Quitar</button>
                                            </div>
                                        ) : currentImageUrl ? (
                                            <div className="text-center">
                                                <img src={currentImageUrl} className="w-20 h-20 object-cover rounded-lg mx-auto mb-2 border border-slate-100 shadow-sm" alt="Preview" />
                                                <p className="text-xs font-bold text-green-700">Imagen guardada</p>
                                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                                                <p className="text-xs text-slate-500">Seleccionar imagen</p>
                                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Campo de URL */}
                            {(contentType === 'video_interactive' || contentType === 'web_only') && (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                                    <label htmlFor="redirect_url" className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-primary" /> {contentType === 'web_only' ? 'URL de la Página Web' : 'URL al tocar pantalla'}
                                    </label>
                                    <input
                                        id="redirect_url"
                                        type="url"
                                        placeholder="https://su-sitio-web.com"
                                        className={`w-full bg-slate-50 border ${errors.redirect_url ? 'border-red-400' : 'border-slate-200'} rounded-xl py-4 px-5 text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
                                        {...register("redirect_url", { required: (contentType === 'video_interactive' || contentType === 'web_only') })}
                                    />
                                    <p className="text-[10px] text-slate-400 italic">
                                        {contentType === 'web_only' ? 'Esta web se mostrará a pantalla completa.' : 'Esta web se abrirá cuando alguien toque el video.'}
                                    </p>
                                </div>
                            )}

                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
                            <div className="flex-1">
                                {saveStatus === 'success' && (
                                    <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                                        <CheckCircle2 className="w-4 h-4" /> ¡Configuración actualizada correctamente!
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full sm:w-auto bg-primary hover:bg-[#D98201] text-white py-4 px-12 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:scale-95 transform active:scale-95"
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
