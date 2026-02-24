import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Link as LinkIcon, AlertCircle, CheckCircle2, MonitorSmartphone, Hash } from 'lucide-react';
import { pb } from '../lib/pocketbase';

interface DeviceForm {
    pairing_code: string;
    name: string;
}

export default function DeviceRegistration() {
    const [isLinking, setIsLinking] = useState(false);
    const [errorStatus, setErrorStatus] = useState<string | null>(null);
    const [successStatus, setSuccessStatus] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<DeviceForm>();

    const onSubmit = async (data: DeviceForm) => {
        setIsLinking(true);
        setErrorStatus(null);
        setSuccessStatus(null);

        try {
            // Find the device by pairing_code
            const records = await pb.collection('devices').getList(1, 1, {
                filter: `pairing_code = "${data.pairing_code}"`,
            });

            if (records.items.length === 0) {
                throw new Error("El código de vinculación es incorrecto o no existe.");
            }

            const device = records.items[0];

            if (device.is_registered) {
                throw new Error("Este dispositivo ya ha sido registrado.");
            }

            // Update the device to mark it as registered
            await pb.collection('devices').update(device.id, {
                name: data.name,
                is_registered: true
            });

            setSuccessStatus(`¡Dispositivo "${data.name}" vinculado exitosamente!`);
            reset(); // clear the form
        } catch (err: any) {
            setErrorStatus(err.message || "Ocurrió un error al vincular el dispositivo.");
            console.error(err);
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <div className="flex flex-col items-center mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
                Vincular Dispositivo
            </h1>
            <p className="text-blue-100 max-w-2xl text-lg opacity-90 mx-auto mb-8">
                Ingrese el código numérico o alfanumérico que aparece en la pantalla de su PWA para emparejarlo a este panel.
            </p>

            <div className="bg-white/80 p-8 rounded-2xl glass w-full max-w-xl mx-auto flex flex-col gap-6 relative z-10 text-left">

                {errorStatus && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{errorStatus}</p>
                    </div>
                )}

                {successStatus && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 border border-green-200">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{successStatus}</p>
                    </div>
                )}

                <div>
                    <h2 className="text-xl font-semibold text-text-primary">Datos del Dispositivo</h2>
                    <p className="text-slate-500 text-sm mt-1">Completa los datos para identificar esta pantalla en la red.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">

                    {/* Pairing Code */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="pairing_code" className="text-sm font-semibold text-text-primary ml-1 flex items-center gap-2">
                            Código de Emparejamiento
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Hash className="h-5 w-5" />
                            </div>
                            <input
                                id="pairing_code"
                                type="text"
                                placeholder="Ej: A49XY2"
                                className={`w-full bg-slate-50 border ${errors.pairing_code ? 'border-red-400 ring-1 ring-red-400' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'} rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 uppercase transition-all outline-none block`}
                                {...register("pairing_code", {
                                    required: "El código es obligatorio.",
                                    pattern: {
                                        value: /^[A-Za-z0-9]+$/,
                                        message: "El código solo puede contener letras y números."
                                    }
                                })}
                            />
                        </div>
                        {errors.pairing_code && <span className="text-xs text-red-500 ml-1">{errors.pairing_code.message}</span>}
                    </div>

                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="name" className="text-sm font-semibold text-text-primary ml-1 flex items-center gap-2">
                            Nombre del Dispositivo
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <MonitorSmartphone className="h-5 w-5" />
                            </div>
                            <input
                                id="name"
                                type="text"
                                placeholder="Ej: Pantalla Lobby Principal"
                                className={`w-full bg-slate-50 border ${errors.name ? 'border-red-400 ring-1 ring-red-400' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'} rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 transition-all outline-none block`}
                                {...register("name", { required: "Debe asignarle un nombre al dispositivo." })}
                            />
                        </div>
                        {errors.name && <span className="text-xs text-red-500 ml-1">{errors.name.message}</span>}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
                        <button
                            type="submit"
                            disabled={isLinking}
                            className="bg-primary hover:bg-[#D98201] text-white py-3 px-8 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-70 shadow-sm"
                        >
                            {isLinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                            Vincular Pantalla
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
