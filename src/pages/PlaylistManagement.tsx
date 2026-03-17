import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, List, Image as ImageIcon, Video, ArrowUp, ArrowDown, X } from 'lucide-react';
import { pb, type Playlist, type PlaylistItem, type Media } from '../lib/pocketbase';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function PlaylistManagement() {
    const { t, language } = useLanguage();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [items, setItems] = useState<PlaylistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [availableMedia, setAvailableMedia] = useState<Media[]>([]);
    const { activeOrganization } = useOrganization();
    const { hasPermission } = useAuth();
    
    const canManageContent = hasPermission('manage_content');

    const fetchPlaylists = async () => {
        if (!activeOrganization) {
            setPlaylists([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const records = await pb.collection('playlists').getFullList<Playlist>({
                sort: '-created',
                filter: `organization = "${activeOrganization.id}"`,
            });
            setPlaylists(records);
            if (records.length > 0 && !selectedPlaylist) {
                handleSelectPlaylist(records[0]);
            }
        } catch (error) {
            console.error('Error fetching playlists:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItems = async (playlistId: string) => {
        try {
            const records = await pb.collection('playlist_items').getFullList<PlaylistItem>({
                filter: `playlist = "${playlistId}"`,
                sort: 'sort_order',
                expand: 'media',
            });
            setItems(records);
        } catch (error) {
            console.error('Error fetching playlist items:', error);
        }
    };

    useEffect(() => {
        fetchPlaylists();
    }, [activeOrganization]);

    const handleSelectPlaylist = (playlist: Playlist) => {
        setSelectedPlaylist(playlist);
        fetchItems(playlist.id);
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        if (!activeOrganization) return;
        setIsSaving(true);
        try {
            const record = await pb.collection('playlists').create({ 
                name: newPlaylistName,
                organization: activeOrganization.id
            }) as any as Playlist;
            setPlaylists([record, ...playlists]);
            handleSelectPlaylist(record);
            setNewPlaylistName('');
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Error creating playlist:', error);
            alert(language === 'es' ? 'Error al crear la lista.' : 'Error creating playlist.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlaylist = async (id: string, name: string) => {
        if (!window.confirm(language === 'es' ? `¿Eliminar la lista "${name}"?` : `Delete playlist "${name}"?`)) return;
        try {
            await pb.collection('playlists').delete(id);
            setPlaylists(playlists.filter(p => p.id !== id));
            if (selectedPlaylist?.id === id) {
                setSelectedPlaylist(null);
                setItems([]);
            }
        } catch (error) {
            console.error('Error deleting playlist:', error);
        }
    };

    const handleOpenMediaModal = async () => {
        if (!activeOrganization) return;
        setIsMediaModalOpen(true);
        try {
            const media = await pb.collection('media').getFullList<Media>({ 
                sort: '-created',
                filter: `organization = "${activeOrganization.id}"`
            });
            setAvailableMedia(media);
        } catch (error) {
            console.error('Error fetching media:', error);
        }
    };

    const handleAddItem = async (media: Media) => {
        if (!selectedPlaylist) return;
        try {
            const newItem = await pb.collection('playlist_items').create({
                playlist: selectedPlaylist.id,
                media: media.id,
                duration: 5,
                sort_order: items.length + 1
            });
            // Fetch expanded version
            const expanded = await pb.collection('playlist_items').getOne<PlaylistItem>(newItem.id, { expand: 'media' });
            setItems([...items, expanded]);
            setIsMediaModalOpen(false);
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleDeleteItem = async (id: string) => {
        try {
            await pb.collection('playlist_items').delete(id);
            setItems(items.filter(i => i.id !== id));
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const handleUpdateDuration = async (id: string, duration: number) => {
        try {
            await pb.collection('playlist_items').update(id, { duration });
            setItems(items.map(i => i.id === id ? { ...i, duration } : i));
        } catch (error) {
            console.error('Error updating duration:', error);
        }
    };

    const moveItem = async (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

        // Optimistic UI update
        setItems(newItems);

        // Update sort_order in database for both items
        try {
            await Promise.all([
                pb.collection('playlist_items').update(newItems[index].id, { sort_order: index + 1 }),
                pb.collection('playlist_items').update(newItems[targetIndex].id, { sort_order: targetIndex + 1 })
            ]);
        } catch (error) {
            console.error('Error moving item:', error);
            fetchItems(selectedPlaylist!.id); // Revert on error
        }
    };

    const isVideo = (filename: string) => filename.toLowerCase().endsWith('.mp4');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{t('playlists.title')}</h1>
                    <p className="text-slate-500 mt-1">{t('playlists.subtitle')}</p>
                </div>
                {canManageContent && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        {t('playlists.newPlaylist')}
                    </button>
                )}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Playlists List */}
                 <aside className="lg:col-span-1 space-y-4">
                    <div className="card-premium h-full min-h-[500px] flex flex-col">
                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-6">{t('playlists.yourPlaylists')}</h2>
                        <div className="flex flex-col gap-2 flex-1">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <span className="text-xs text-slate-400 font-medium">Loading...</span>
                                </div>
                             ) : !activeOrganization ? (
                                <div className="text-center py-10 px-4">
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{language === 'es' ? 'Selecciona una empresa.' : 'Select a company.'}</p>
                                </div>
                            ) : playlists.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{t('playlists.noPlaylists')}</p>
                                </div>
                            ) : (
                                playlists.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelectPlaylist(p)}
                                        className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedPlaylist?.id === p.id
                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                            : 'hover:bg-slate-50 text-slate-700 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <List className={`w-4 h-4 flex-shrink-0 ${selectedPlaylist?.id === p.id ? 'text-white' : 'text-primary'}`} />
                                            <span className="font-bold truncate text-sm">{p.name}</span>
                                        </div>
                                        {canManageContent && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(p.id, p.name); }}
                                                className={`p-1.5 rounded-xl transition-all ${selectedPlaylist?.id === p.id
                                                    ? 'text-white/60 hover:bg-white/20 hover:text-white'
                                                    : 'text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                                                    }`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content: Playlist Items */}
                <main className="lg:col-span-3">
                    {selectedPlaylist ? (
                        <div className="space-y-6">
                            <div className="card-premium flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                                        <List className="w-7 h-7" />
                                    </div>
                                     <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedPlaylist.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{items.length} {t('playlists.elements')}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="text-xs font-medium text-slate-400 italic">{t('playlists.sequenceOrder')}</span>
                                        </div>
                                    </div>
                                </div>
                                {canManageContent && (
                                     <button
                                        onClick={handleOpenMediaModal}
                                        className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-4 px-8"
                                    >
                                        <Plus className="w-5 h-5" /> {t('playlists.addContent')}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {items.length === 0 ? (
                                    <div className="card-premium flex flex-col items-center justify-center py-24 bg-slate-50/50 border-dashed">                                         <div className="bg-slate-200 p-6 rounded-3xl mb-4">
                                            <Plus className="w-12 h-12 text-slate-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">{t('playlists.emptyPlaylist')}</h3>
                                        <p className="text-slate-500 mt-2 mb-8">{t('playlists.emptySubtitle')}</p>
                                        {canManageContent && (
                                            <button onClick={handleOpenMediaModal} className="btn-primary">{t('playlists.addFirst')}</button>
                                        )}
                                    </div>

                                ) : (
                                    items.map((item, index) => {
                                        const media = item.expand?.media;
                                        if (!media) return null;
                                        const fileUrl = pb.files.getURL(media, media.file);
                                        const videoFile = isVideo(media.file);

                                        return (
                                            <div key={item.id} className="card-premium flex flex-col sm:flex-row items-center gap-4 sm:gap-6 group hover:border-primary/20 transition-all text-center sm:text-left">
                                                <div className="text-slate-300 font-black text-2xl italic w-full sm:w-10 text-center flex-shrink-0 group-hover:text-primary/20 transition-colors">{index + 1}</div>

                                                <div className="w-full sm:w-32 aspect-video sm:h-20 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100 shadow-inner">
                                                    {videoFile ? (
                                                        <video src={`${fileUrl}#t=0.1`} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={fileUrl} className="w-full h-full object-cover" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 truncate mb-2">{media.name}</p>
                                                    <div className="flex items-center gap-3">                                                         {videoFile ? (
                                                            <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-blue-100">
                                                                <Video className="w-3 h-3" /> {t('media.typeVideo')}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-100">
                                                                <ImageIcon className="w-3 h-3" /> {t('media.typeImage')}
                                                            </span>
                                                        )}

                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 sm:gap-1.5 ml-auto w-full sm:w-auto justify-center sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                                                    {!videoFile && (
                                                        <div className="flex flex-col items-center gap-1 bg-slate-50 p-2 sm:p-3 rounded-2xl border border-slate-100 min-w-[80px] sm:min-w-[100px]">
                                                            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('playlists.duration')}</label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={item.duration}
                                                                    disabled={!canManageContent}
                                                                    onChange={(e) => handleUpdateDuration(item.id, parseInt(e.target.value) || 1)}
                                                                    className="w-8 sm:w-12 text-center bg-transparent font-bold text-primary outline-none disabled:opacity-50 text-sm"
                                                                    min="1"
                                                                />
                                                                <span className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase">{t('playlists.sec')}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {canManageContent && (
                                                        <>
                                                            <div className="flex flex-row sm:flex-col gap-2 sm:gap-1">
                                                                <button
                                                                    onClick={() => moveItem(index, 'up')}
                                                                    disabled={index === 0}
                                                                    className="p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-primary disabled:opacity-30 transition-all border border-transparent hover:border-slate-100 bg-slate-50 sm:bg-transparent"
                                                                >
                                                                    <ArrowUp className="w-5 h-5 sm:w-4 sm:h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => moveItem(index, 'down')}
                                                                    disabled={index === items.length - 1}
                                                                    className="p-2.5 sm:p-2 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-primary disabled:opacity-30 transition-all border border-transparent hover:border-slate-100 bg-slate-50 sm:bg-transparent"
                                                                >
                                                                    <ArrowDown className="w-5 h-5 sm:w-4 sm:h-4" />
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-3 sm:p-3 rounded-2xl bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all border border-slate-100"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                         <div className="card-premium flex flex-col items-center justify-center py-32 bg-slate-50/50 border-dashed text-center">
                            <div className="bg-slate-200 p-8 rounded-full mb-6 text-slate-300">
                                <List className="w-16 h-16" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">{t('playlists.selectPlaylist')}</h3>
                            <p className="text-slate-500 mt-2 max-w-sm">{t('playlists.selectSubtitle')}</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Create Playlist Modal */}
             {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">{t('playlists.newPlaylist')}</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                         </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('playlists.playlistName')}</label>
                                <input
                                    type="text"
                                     autoFocus
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    placeholder={language === 'es' ? "Ej. Promociones, Bienvenida..." : "e.g. Sales Promos, Welcome Loop..."}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 font-bold"
                                />
                            </div>
                            <button
                                 onClick={handleCreatePlaylist}
                                disabled={!newPlaylistName.trim() || isSaving}
                                className="w-full btn-primary flex justify-center py-4"
                            >
                                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : t('playlists.newPlaylist')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Gallery (Picker) Modal */}
            {isMediaModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                         <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">{t('playlists.addContent')}</h3>
                                <p className="text-slate-500 font-medium mt-1">{language === 'es' ? 'Selecciona un archivo para añadir a tu secuencia.' : 'Select an asset to add to your sequence.'}</p>
                            </div>
                            <button
                                onClick={() => setIsMediaModalOpen(false)}
                                className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {availableMedia.map((media) => {
                                    const videoFile = isVideo(media.file);
                                    return (
                                        <div
                                            key={media.id}
                                            onClick={() => handleAddItem(media)}
                                            className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all cursor-pointer flex flex-col"
                                        >
                                            <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center">
                                                {videoFile ? (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                                        <Video className="w-10 h-10 text-white/50" />
                                                    </div>
                                                ) : (
                                                    <img src={pb.files.getURL(media, media.file, { thumb: '300x300' })} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                )}
                                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-all flex items-center justify-center">
                                                    <div className="bg-white p-2.5 rounded-2xl text-primary shadow-xl opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
                                                        <Plus className="w-6 h-6" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 border-t border-slate-50">
                                                <p className="text-xs font-bold text-slate-700 truncate" title={media.name}>{media.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
