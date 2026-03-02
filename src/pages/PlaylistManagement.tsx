import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, List, Image as ImageIcon, Video, ArrowUp, ArrowDown, X } from 'lucide-react';
import { pb, type Playlist, type PlaylistItem, type Media } from '../lib/pocketbase';

export default function PlaylistManagement() {
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

    const fetchPlaylists = async () => {
        setIsLoading(true);
        try {
            const records = await pb.collection('playlists').getFullList<Playlist>({
                sort: '-created',
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
    }, []);

    const handleSelectPlaylist = (playlist: Playlist) => {
        setSelectedPlaylist(playlist);
        fetchItems(playlist.id);
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        setIsSaving(true);
        try {
            const record = await pb.collection('playlists').create({ name: newPlaylistName }) as any as Playlist;
            setPlaylists([record, ...playlists]);
            handleSelectPlaylist(record);
            setNewPlaylistName('');
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Error creating playlist:', error);
            alert('Error al crear la lista.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlaylist = async (id: string, name: string) => {
        if (!window.confirm(`¿Eliminar la lista "${name}"?`)) return;
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
        setIsMediaModalOpen(true);
        try {
            const media = await pb.collection('media').getFullList<Media>({ sort: '-created' });
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
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-7xl mx-auto w-full">
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4 glass bg-white/70 p-6 rounded-3xl m-2">
                <div>
                    <h1 className="text-3xl font-black text-text-primary tracking-tight">Listas de Reproducción</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Crea secuencias de contenido para tus pantallas.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-primary hover:bg-[#D98201] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Nueva Lista
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-2">
                {/* Sidebar: Playlists List */}
                <aside className="lg:col-span-1 flex flex-col gap-4">
                    <div className="glass bg-white p-4 rounded-2xl border border-slate-100 min-h-[400px]">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Tus Listas</h2>
                        <div className="flex flex-col gap-1">
                            {isLoading ? (
                                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                            ) : playlists.length === 0 ? (
                                <p className="text-center text-sm text-slate-400 py-10">No hay listas creadas.</p>
                            ) : (
                                playlists.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelectPlaylist(p)}
                                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedPlaylist?.id === p.id ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <List className={`w-4 h-4 flex-shrink-0 ${selectedPlaylist?.id === p.id ? 'text-white' : 'text-primary'}`} />
                                            <span className="font-bold truncate text-sm">{p.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(p.id, p.name); }}
                                            className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500 hover:text-white transition-all ${selectedPlaylist?.id === p.id ? 'text-white/60 hover:bg-white/20' : 'text-red-400'}`}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content: Playlist Items */}
                <main className="lg:col-span-3">
                    {selectedPlaylist ? (
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between glass bg-white p-6 rounded-2xl border-b-4 border-primary/20">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-xl">
                                        <List className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">{selectedPlaylist.name}</h2>
                                        <p className="text-xs text-slate-400 font-medium italic">{items.length} elementos en total</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleOpenMediaModal}
                                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Agregar Contenido
                                </button>
                            </div>

                            <div className="flex flex-col gap-3">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 glass bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                                        <p className="text-slate-500 font-medium mb-4">Esta lista está vacía.</p>
                                        <button
                                            onClick={handleOpenMediaModal}
                                            className="text-primary font-bold flex items-center gap-2 hover:underline"
                                        >
                                            <Plus className="w-4 h-4" /> Agregar primer elemento
                                        </button>
                                    </div>
                                ) : (
                                    items.map((item, index) => {
                                        const media = item.expand?.media;
                                        if (!media) return null;
                                        const fileUrl = pb.files.getURL(media, media.file);
                                        const videoFile = isVideo(media.file);

                                        return (
                                            <div key={item.id} className="glass bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:shadow-lg transition-all">
                                                <div className="text-slate-300 font-black text-xl italic w-8 text-center">{index + 1}</div>

                                                <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                                                    {videoFile ? (
                                                        <video src={`${fileUrl}#t=0.1`} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={fileUrl} className="w-full h-full object-cover" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate">{media.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        {videoFile ? (
                                                            <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                <Video className="w-3 h-3" /> Video
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[10px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                <ImageIcon className="w-3 h-3" /> Imagen
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {!videoFile && (
                                                    <div className="flex flex-col items-center gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Duración</label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={item.duration}
                                                                onChange={(e) => handleUpdateDuration(item.id, parseInt(e.target.value) || 1)}
                                                                className="w-12 text-center bg-transparent font-bold text-primary outline-none text-sm"
                                                                min="1"
                                                            />
                                                            <span className="text-xs text-slate-400 font-medium">s</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => moveItem(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-all"
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveItem(index, 'down')}
                                                        disabled={index === items.length - 1}
                                                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 transition-all"
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-all ml-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 glass bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                            <List className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-500 font-medium">Selecciona una lista para ver sus elementos.</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Create Playlist Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-slate-800 mb-6">Nueva Lista</h3>
                        <div className="flex flex-col gap-4">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nombre de la lista</label>
                            <input
                                type="text"
                                autoFocus
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="Ej: Promociones Marzo"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-slate-800 outline-none focus:border-primary transition-all font-bold"
                            />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-4 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreatePlaylist}
                                    disabled={!newPlaylistName.trim() || isSaving}
                                    className="flex-1 bg-primary text-white py-4 px-6 rounded-xl font-bold shadow-lg hover:bg-[#D98201] transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Lista'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Gallery (Picker) Modal */}
            {isMediaModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Agregar de Galería</h3>
                                <p className="text-sm text-slate-500">Selecciona una imagen o video para tu lista.</p>
                            </div>
                            <button
                                onClick={() => setIsMediaModalOpen(false)}
                                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {availableMedia.map((media) => {
                                    const videoFile = isVideo(media.file);
                                    return (
                                        <div
                                            key={media.id}
                                            onClick={() => handleAddItem(media)}
                                            className="relative rounded-xl overflow-hidden border-2 border-transparent hover:border-primary bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                                {videoFile ? (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                                        <Video className="w-8 h-8 text-white/50" />
                                                    </div>
                                                ) : (
                                                    <img src={pb.files.getURL(media, media.file, { thumb: '300x300' })} className="w-full h-full object-cover" />
                                                )}
                                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-all flex items-center justify-center">
                                                    <Plus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all" />
                                                </div>
                                            </div>
                                            <div className="p-3 border-t border-slate-100">
                                                <p className="text-xs font-bold text-slate-700 truncate">{media.name}</p>
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
