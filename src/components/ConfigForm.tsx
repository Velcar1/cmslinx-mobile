import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, FileVideo, CheckCircle2, Folder, Image as ImageIcon, Globe, Tv, MonitorPlay, Plus, Video, Trash2, X, List, Link, FileCode } from 'lucide-react';
import { pb, type PWAConfig, type Media, type Playlist } from '../lib/pocketbase';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type ContentType = 'video_interactive' | 'video_only' | 'image_only' | 'web_only' | 'playlist' | 'url_only' | 'html_only';

interface ConfigFormInputs {
    redirect_url: string;
    name_schedule?: string;
    schedule_start?: string;
    schedule_end?: string;
}

interface DeviceGroup {
    id: string;
    name: string;
}

interface ConfigFormProps {
    forceGroupId?: string;
    isSchedule?: boolean;
    configToEdit?: string | null;
    onSaveSuccess?: () => void;
}

export default function ConfigForm({ forceGroupId, isSchedule = false, configToEdit = null, onSaveSuccess }: ConfigFormProps) {
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>(forceGroupId || '');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

    // Content Type state
    const [contentType, setContentType] = useState<ContentType>('video_interactive');

    // Media Selection state
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);

    // Playlist state
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
    const { activeOrganization } = useOrganization();
    const { hasPermission } = useAuth();
    const { t, language } = useLanguage();
    
    const canManageContent = hasPermission('manage_content');

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ConfigFormInputs>();

    // Fetch groups on mount
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                if (!activeOrganization) {
                    setIsLoading(false);
                    return;
                }
                const records = await pb.collection('device_groups').getFullList<DeviceGroup>({
                    filter: `organization = "${activeOrganization.id}"`
                });
                setGroups(records);

                if (!forceGroupId && records.length > 0) {
                    setSelectedGroup(records[0].id);
                } else if (forceGroupId) {
                    setSelectedGroup(forceGroupId);
                } else if (records.length === 0) {
                    setIsLoading(false);
                }

                // Fetch playlists too
                const plistRecords = await pb.collection('playlists').getFullList<Playlist>({
                    filter: `organization = "${activeOrganization.id}"`
                });
                setPlaylists(plistRecords);
            } catch (err) {
                console.error("Error fetching groups/playlists:", err);
                setIsLoading(false);
            }
        };
        fetchGroups();
    }, [forceGroupId, activeOrganization]);

    // Fetch config when selectedGroup changes
    useEffect(() => {
        if (!selectedGroup) return;

        const fetchConfig = async () => {
            setIsLoading(true);
            setSaveStatus(null);
            setConfigId(null);
            setSelectedMedia(null);

            try {
                let record;
                if (configToEdit) {
                    record = await pb.collection('pwa_config').getOne<PWAConfig>(configToEdit, { expand: 'media,playlist' });
                } else if (!isSchedule) {
                    record = await pb.collection('pwa_config').getFirstListItem<PWAConfig>(`group = "${selectedGroup}" && is_schedule != true`, {
                        sort: '-created',
                        expand: 'media,playlist'
                    });
                }

                if (record) {
                    setConfigId(record.id);
                    setContentType(record.content_type || 'video_interactive');
                    reset({
                        redirect_url: record.redirect_url,
                        name_schedule: record.name_schedule || '',
                        schedule_start: record.schedule_start ? new Date(record.schedule_start).toISOString().slice(0, 16) : '',
                        schedule_end: record.schedule_end ? new Date(record.schedule_end).toISOString().slice(0, 16) : ''
                    });

                    if (record.expand && record.expand.media) {
                        setSelectedMedia(record.expand.media);
                    }
                    if (record.playlist) {
                        setSelectedPlaylistId(record.playlist);
                    } else {
                        setSelectedPlaylistId('');
                    }
                } else {
                    reset({ redirect_url: '', schedule_start: '', schedule_end: '' });
                    setSelectedMedia(null);
                    setSelectedPlaylistId('');
                    setContentType('video_interactive');
                }
            } catch (err: any) {
                if (err.status === 404) {
                    reset({ redirect_url: '', name_schedule: '', schedule_start: '', schedule_end: '' });
                    setSelectedMedia(null);
                    setContentType('video_interactive');
                } else if (!err.isAbort) {
                    console.error('Error fetching config:', err);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, [selectedGroup, isSchedule, configToEdit, reset]);

    const handleOpenMediaModal = async () => {
        if (!canManageContent) return;
        setIsMediaModalOpen(true);
        setIsLoadingMedia(true);
        try {
            if (!activeOrganization) return;
            const records = await pb.collection('media').getFullList<Media>({
                sort: '-created',
                filter: `organization = "${activeOrganization.id}"`,
            });
            setMediaList(records);
        } catch (error) {
            console.error('Error fetching media:', error);
            alert('Error al cargar la galería.');
        } finally {
            setIsLoadingMedia(false);
        }
    };

    const handleSelectMedia = (media: Media) => {
        setSelectedMedia(media);
        setIsMediaModalOpen(false);
    };

    const isVideo = (filename: string) => {
        if (!filename) return false;
        return filename.toLowerCase().endsWith('.mp4');
    };

    const isHtml = (filename: string) => {
        if (!filename) return false;
        return filename.toLowerCase().endsWith('.html');
    };

    const onSubmit = async (data: ConfigFormInputs) => {
        if (!selectedGroup) {
            alert("Por favor cree un grupo primero.");
            return;
        }

        setIsSaving(true);
        setSaveStatus(null);

        try {
            if (!activeOrganization) throw new Error("No hay una empresa seleccionada.");
            const formData = new FormData();
            formData.append('content_type', contentType);
            formData.append('group', selectedGroup);
            formData.append('organization', activeOrganization.id);

            if (isSchedule) {
                formData.append('is_schedule', 'true');
                formData.append('name_schedule', data.name_schedule || '');
                if (!data.schedule_start || !data.schedule_end) {
                    throw new Error("Debe especificar fecha/hora de inicio y fin para la programación.");
                }
                const startDate = new Date(data.schedule_start);
                const endDate = new Date(data.schedule_end);
                
                if (startDate >= endDate) {
                    throw new Error(t('groups.scheduleError'));
                }
                
                formData.append('schedule_start', startDate.toISOString());
                formData.append('schedule_end', endDate.toISOString());
            } else {
                formData.append('is_schedule', 'false');
                formData.append('schedule_start', '');
                formData.append('schedule_end', '');
            }

            // Required fields validation based on type
            if ((contentType === 'video_interactive' || contentType === 'video_only' || contentType === 'image_only' || contentType === 'html_only') && !selectedMedia) {
                throw new Error("Debe seleccionar un archivo multimedia para este tipo de contenido.");
            }
            if ((contentType === 'video_interactive' || contentType === 'video_only') && selectedMedia && !isVideo(selectedMedia.file)) {
                throw new Error("Debe seleccionar un archivo de video (MP4) para este tipo de contenido.");
            }
            if (contentType === 'image_only' && selectedMedia && isVideo(selectedMedia.file)) {
                throw new Error("Debe seleccionar un archivo de imagen para este tipo de contenido.");
            }
            if (contentType === 'html_only' && selectedMedia && !isHtml(selectedMedia.file)) {
                throw new Error("Debe seleccionar un archivo HTML (.html) para este tipo de contenido.");
            }
            if (contentType === 'playlist' && !selectedPlaylistId) {
                throw new Error("Debe seleccionar una Playlist para este tipo de contenido.");
            }
            if ((contentType === 'video_interactive' || contentType === 'web_only' || contentType === 'url_only') && !data.redirect_url) {
                throw new Error(language === 'es' ? "URL requerida para este tipo de contenido." : "URL required for this content type.");
            }

            formData.append('redirect_url', data.redirect_url);

            if (contentType === 'playlist') {
                formData.append('playlist', selectedPlaylistId);
                formData.append('media', ''); // clear media relation
            } else if (selectedMedia) {
                formData.append('media', selectedMedia.id);
                formData.append('playlist', ''); // clear playlist relation
            } else {
                formData.append('media', '');
                formData.append('playlist', '');
            }

            let record;
            if (configId) {
                // Remove old fields for cleanliness if desired, PocketBase just ignores absent fields
                record = await pb.collection('pwa_config').update(configId, formData);
            } else {
                record = await pb.collection('pwa_config').create(formData);
            }

            setConfigId(record.id);
            setSaveStatus('success');
            if (onSaveSuccess) {
                setTimeout(onSaveSuccess, 1500);
            }
        } catch (err: any) {
            console.error('Error saving config:', err);
            alert(err.message || "Error al guardar la configuración.");
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (groups.length === 0 && !isLoading && !forceGroupId) {
        return (
            <div className="bg-white/80 p-12 rounded-2xl glass w-full max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
                {!activeOrganization ? (
                    <>
                        <Building2 className="w-12 h-12 text-slate-300" />
                        <h2 className="text-xl font-semibold text-text-primary">No hay empresa seleccionada</h2>
                        <p className="text-slate-500 max-w-sm">
                            Por favor, selecciona o crea una empresa en el menú lateral.
                        </p>
                    </>
                ) : (
                    <>
                        <Folder className="w-12 h-12 text-slate-300" />
                        <h2 className="text-xl font-semibold text-text-primary">No hay grupos configurados</h2>
                        <p className="text-slate-500 max-w-sm">
                            Primero debe crear un grupo de pantallas en la sección "Grupos" para poder asignarles contenido.
                        </p>
                    </>
                )}
            </div>
        );
    }

    const contentTypes: { id: ContentType, label: string, icon: any, desc: string }[] = [
        { id: 'video_interactive', label: 'Video Interactivo', icon: MonitorPlay, desc: 'Video en loop que abre una web al tocar' },
        { id: 'video_only', label: 'Solo Video', icon: Tv, desc: 'Video en loop sin interacción' },
        { id: 'playlist', label: 'Playlist', icon: List, desc: 'Secuencia de videos e imágenes' },
        { id: 'image_only', label: 'Solo Imagen', icon: ImageIcon, desc: 'Imagen fija en pantalla completa' },
        { id: 'web_only', label: 'Solo Web', icon: Globe, desc: 'Carga una página web directamente' },
        { id: 'url_only', label: t('playlists.typeUrl'), icon: Link, desc: t('playlists.typeUrlDesc') },
        { id: 'html_only', label: t('playlists.typeHtml'), icon: FileCode, desc: t('playlists.typeHtmlDesc') },
    ];

    const showMediaSelector = contentType !== 'web_only' && contentType !== 'playlist' && contentType !== 'url_only';
    const showPlaylistSelector = contentType === 'playlist';

    return (
        <>
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 relative z-10 text-left">
                {!forceGroupId && (
                    <div className="bg-white/80 p-6 rounded-2xl glass flex flex-col sm:flex-row items-center gap-4 border-b-4 border-primary/20 transition-all duration-300">
                        <label className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                            <Folder className="w-5 h-5 text-primary" /> Seleccionar Grupo:
                        </label>
                        <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            disabled={!canManageContent}
                            className="flex-1 bg-white border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 px-4 text-slate-800 transition-all outline-none font-medium text-lg cursor-pointer disabled:bg-slate-50 disabled:opacity-75"
                        >
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="bg-white/80 p-8 rounded-2xl glass flex flex-col gap-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-slate-500 font-medium">Cargando configuración...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                            {isSchedule && (
                                <div className="space-y-6 bg-primary/5 p-6 rounded-2xl border border-primary/20">
                                    <div>
                                        <label className="text-sm font-bold text-slate-700 mb-2 block uppercase tracking-wider">Nombre de la Programación</label>
                                        <input
                                            type="text"
                                            {...register("name_schedule", { required: isSchedule })}
                                            placeholder="Ej: Promo Fin de Semana"
                                            className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 outline-none transition-all text-slate-800"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block text-xs uppercase opacity-70">Inicio</label>
                                            <input
                                                type="datetime-local"
                                                {...register("schedule_start", { required: isSchedule })}
                                                disabled={!canManageContent}
                                                className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 outline-none transition-all text-slate-800 text-sm disabled:bg-slate-50 disabled:opacity-75"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block text-xs uppercase opacity-70">Fin</label>
                                            <input
                                                type="datetime-local"
                                                {...register("schedule_end", { required: isSchedule })}
                                                disabled={!canManageContent}
                                                className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 outline-none transition-all text-slate-800 text-sm disabled:bg-slate-50 disabled:opacity-75"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                            onClick={() => canManageContent && setContentType(type.id)}
                                            className={`flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all duration-300 ${contentType === type.id
                                                ? 'border-primary bg-primary/5 shadow-lg scale-105'
                                                : 'border-slate-100 bg-slate-50/50'
                                                } ${canManageContent ? 'hover:border-primary/30 cursor-pointer' : 'cursor-default opacity-80'}`}
                                        >
                                            <type.icon className={`w-8 h-8 mb-3 ${contentType === type.id ? 'text-primary' : 'text-slate-400'}`} />
                                            <span className={`text-sm font-bold block ${contentType === type.id ? 'text-primary' : 'text-slate-600'}`}>{type.label}</span>
                                            <p className="text-[10px] text-slate-400 mt-1 leading-tight h-8 flex items-center">{type.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selector de Playlist */}
                            {showPlaylistSelector && (
                                <div className="space-y-4 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4">
                                    <label className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                                        <List className="w-4 h-4 text-primary" /> Seleccionar Playlist
                                    </label>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        {playlists.length === 0 ? (
                                            <div className="text-center py-4">
                                                <p className="text-sm text-slate-500 mb-4">No has creado ninguna playlist todavía.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => window.open('/playlists', '_blank')}
                                                    className="bg-primary hover:bg-[#D98201] text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md text-sm"
                                                >
                                                    Crear Playlist en nueva pestaña
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                value={selectedPlaylistId}
                                                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                                                disabled={!canManageContent}
                                                className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-4 px-5 text-slate-800 transition-all outline-none font-bold shadow-sm disabled:bg-slate-50 disabled:opacity-75"
                                            >
                                                <option value="">-- Elige una lista --</option>
                                                {playlists.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">

                                {/* Campo Multimedia desde Galería */}
                                {showMediaSelector && (
                                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4">
                                        <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                            {contentType === 'image_only' ? <ImageIcon className="w-4 h-4 text-primary" /> : contentType === 'html_only' ? <FileCode className="w-4 h-4 text-primary" /> : <FileVideo className="w-4 h-4 text-primary" />}
                                            Archivo Multimedia
                                        </label>
                                        <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-4 min-h-[180px] bg-white">
                                            {selectedMedia ? (
                                                <div className="flex flex-col items-center text-center w-full">
                                                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-100 mb-3 border border-slate-200 flex items-center justify-center relative shadow-inner">
                                                        {isVideo(selectedMedia.file) ? (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                                                <Video className="w-12 h-12 text-white/50" />
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={pb.files.getURL(selectedMedia, selectedMedia.file, { thumb: '400x300' })}
                                                                alt={selectedMedia.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700 truncate w-full px-2" title={selectedMedia.name}>{selectedMedia.name}</p>
                                                    <div className="flex gap-2 mt-3 w-full">
                                                        {canManageContent && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleOpenMediaModal}
                                                                    className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-bold transition-colors"
                                                                >
                                                                    Cambiar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedMedia(null)}
                                                                    className="px-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center w-full flex flex-col items-center">
                                                    <div className="bg-primary/10 p-4 rounded-full mb-3">
                                                        <Folder className="w-8 h-8 text-primary" />
                                                    </div>
                                                    <p className="text-sm text-slate-500 mb-4 px-4">Selecciona un archivo de tu biblioteca de medios</p>
                                                    {canManageContent ? (
                                                        <button
                                                            type="button"
                                                            onClick={handleOpenMediaModal}
                                                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                                                        >
                                                            <Plus className="w-4 h-4" /> Abrir Galería
                                                        </button>
                                                    ) : (
                                                        <p className="text-sm font-bold text-slate-400">Sin archivo seleccionado</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Campo de URL */}
                                {(contentType === 'video_interactive' || contentType === 'web_only' || contentType === 'url_only') && (
                                    <div className={`flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 ${!showMediaSelector ? 'md:col-span-2' : ''}`}>
                                        <label htmlFor="redirect_url" className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-primary" /> {contentType === 'web_only' ? 'URL de la Página Web' : 'URL al tocar pantalla'}
                                        </label>
                                        <input
                                            id="redirect_url"
                                            type="url"
                                            placeholder="https://su-sitio-web.com"
                                            disabled={!canManageContent}
                                            className={`w-full bg-slate-50 border ${errors.redirect_url ? 'border-red-400' : 'border-slate-200'} rounded-xl py-4 px-5 text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:bg-slate-100 disabled:opacity-75`}
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
                                {canManageContent && (
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full sm:w-auto bg-primary hover:bg-[#D98201] text-white py-4 px-12 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:scale-95 transform active:scale-95"
                                    >
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Modal de Galería Multimedia */}
            {isMediaModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Seleccionar de Galería</h3>
                                <p className="text-sm text-slate-500">Elige un archivo para este grupo.</p>
                            </div>
                            <button
                                onClick={() => setIsMediaModalOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                            {isLoadingMedia ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                    <p className="text-sm font-medium text-slate-500">Cargando biblioteca...</p>
                                </div>
                            ) : mediaList.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ImageIcon className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="font-semibold text-slate-600">Galería vacía</p>
                                    <p className="text-sm text-slate-500 mt-1 mb-6">Sube archivos primero en la sección Multimedios.</p>
                                    <button
                                        onClick={() => window.open('/media', '_blank')}
                                        className="text-primary font-bold hover:underline"
                                    >
                                        Ir a Multimedios &rarr;
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {mediaList.map((media) => {
                                        const videoFile = isVideo(media.file);
                                        const htmlFile = isHtml(media.file);
                                        const isSelected = selectedMedia?.id === media.id;
                                        // Validate file type based on selected content_type
                                        const isSelectable =
                                            ((contentType === 'video_interactive' || contentType === 'video_only') && videoFile) ||
                                            (contentType === 'image_only' && !videoFile && !htmlFile) ||
                                            (contentType === 'html_only' && htmlFile);

                                        return (
                                            <div
                                                key={media.id}
                                                onClick={() => isSelectable && handleSelectMedia(media)}
                                                className={`
                                                    relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-white
                                                    ${isSelected ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-transparent hover:border-slate-300 shadow-sm'}
                                                    ${!isSelectable ? 'opacity-40 cursor-not-allowed grayscale-[50%]' : 'hover:shadow-md'}
                                                `}
                                            >
                                                <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                                    {videoFile ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                                            <Video className="w-8 h-8 text-white/50" />
                                                        </div>
                                                    ) : htmlFile ? (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100">
                                                            <FileCode className="w-10 h-10 text-primary" />
                                                            <span className="text-[10px] font-bold text-primary mt-1">HTML</span>
                                                        </div>
                                                    ) : (
                                                        <img src={pb.files.getURL(media, media.file, { thumb: '300x300' })} alt={media.name} className="w-full h-full object-cover" />
                                                    )}

                                                    {videoFile && (
                                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md rounded px-2 py-1 flex items-center gap-1">
                                                            <Video className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 border-t border-slate-100">
                                                    <p className="text-xs font-bold text-slate-700 truncate" title={media.name}>{media.name}</p>
                                                    {!isSelectable && (
                                                        <p className="text-[9px] text-red-500 font-bold mt-1 uppercase">Formato incorrecto</p>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1 text-white shadow-sm">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
