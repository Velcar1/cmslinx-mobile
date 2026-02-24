import { useEffect, useState } from 'react';
import { Loader2, MonitorPlay, Calendar, AlertCircle, RefreshCw, Unlink } from 'lucide-react';
import { pb } from '../lib/pocketbase';

interface DeviceRecord {
    id: string;
    pairing_code: string;
    name: string;
    is_registered: boolean;
    created: string;
}

export default function DeviceList() {
    const [devices, setDevices] = useState<DeviceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorStatus, setErrorStatus] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDevices = async () => {
        try {
            setIsRefreshing(true);
            setErrorStatus(null);

            const records = await pb.collection('devices').getFullList<DeviceRecord>({
                filter: 'is_registered = true',
                sort: '-created',
            });
            setDevices(records);
        } catch (err: any) {
            if (err.isAbort) return;
            setErrorStatus("No se pudo cargar la lista de dispositivos. Verifique su conexión.");
            console.error(err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDevices();

        // Optional: Realtime subscription (requires Pocketbase Realtime API to be enabled natively for this collection)
        const subscribeToUpdates = async () => {
            try {
                await pb.collection('devices').subscribe('*', function () {
                    // refresh on any change to 'devices' collection
                    fetchDevices();
                });
            } catch (err) {
                console.warn("Could not subscribe to Pocketbase realtime updates", err);
            }
        };

        subscribeToUpdates();

        return () => {
            pb.collection('devices').unsubscribe('*').catch(() => { });
        };
    }, []);

    const handleUnlink = async (id: string, name: string) => {
        const confirmUnlink = window.confirm(`¿Está seguro de que desea desvincular el dispositivo "${name}"? La PWA mostrará de nuevo la pantalla de vinculación.`);
        if (!confirmUnlink) return;

        try {
            await pb.collection('devices').update(id, {
                is_registered: false,
                name: ''
            });
            // the realtime subscription should trigger a refresh automatically, but we can do it manually just in case
            await fetchDevices();
        } catch (err: any) {
            alert("Error al intentar desvincular: " + err.message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-24">
                <Loader2 className="w-10 h-10 text-white animate-spin drop-shadow-md" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
                Dispositivos Conectados
            </h1>
            <p className="text-blue-100 max-w-2xl text-lg opacity-90 mx-auto mb-8">
                Administre todos los dispositivos enlazados y reproduciendo su contenido actual.
            </p>

            <div className="bg-white/80 p-8 rounded-2xl glass w-full max-w-4xl mx-auto flex flex-col gap-6 relative z-10 text-left">

                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                        <MonitorPlay className="w-5 h-5" />
                        Pantallas Activas
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                            {devices.length}
                        </span>
                    </h2>
                    <button
                        onClick={fetchDevices}
                        disabled={isRefreshing}
                        className="text-sm font-medium text-slate-500 hover:text-primary transition-colors flex items-center gap-1 p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>

                {errorStatus && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{errorStatus}</p>
                    </div>
                )}

                {devices.length === 0 && !errorStatus ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <MonitorPlay className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium text-center">No hay dispositivos vinculados actualmente.</p>
                        <p className="text-slate-400 text-sm mt-1 text-center max-w-sm">
                            Use la vista de "Vincular Dispositivo" e ingrese el código que aparece en la pantalla de su PWA.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {devices.map((device) => {
                            const date = new Date(device.created);
                            const formattedDate = new Intl.DateTimeFormat('es-ES', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            }).format(date);

                            return (
                                <div key={device.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col justify-between">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-3 rounded-lg text-primary">
                                                <MonitorPlay className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-text-primary text-lg truncate pr-2" title={device.name}>
                                                    {device.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                    <span className="bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
                                                        Conectado
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Vinculado: {formattedDate}
                                        </div>
                                        <button
                                            onClick={() => handleUnlink(device.id, device.name)}
                                            className="text-red-500 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-600 text-xs font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                                        >
                                            <Unlink className="w-3.5 h-3.5" />
                                            Desvincular
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </div>
    );
}
