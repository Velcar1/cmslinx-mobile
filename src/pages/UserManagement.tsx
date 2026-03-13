import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { pb, type User, type Organization } from '../lib/pocketbase';
import { Plus, Loader2, User as UserIcon, Building2, Shield, Search, X, Trash2, Users } from 'lucide-react';

export default function UserManagement() {
    const { user: currentUser, hasPermission } = useAuth();
    const { activeOrganization } = useOrganization();
    
    const [users, setUsers] = useState<User[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'viewer' as User['role'],
        organization: ''
    });

    const isSuperadmin = currentUser?.role === 'superadmin';

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            let filterString = '';
            
            // If not superadmin, only fetch users in their organization
            if (!isSuperadmin) {
                if (!currentUser?.organization) {
                    setUsers([]);
                    return;
                }
                filterString = `organization = "${currentUser.organization}"`;
            } else {
                // Superadmin can filter by activeOrganization if they want, but let's show all by default
                // Optionally filter by active org if it exists
                if (activeOrganization) {
                    filterString = `organization = "${activeOrganization.id}" || organization = ""`; // include superadmins
                }
            }

            const records = await pb.collection('users').getFullList<User>({
                filter: filterString,
                sort: '-created',
                expand: 'organization'
            });
            setUsers(records);

            if (isSuperadmin) {
                const orgs = await pb.collection('organizations').getFullList<Organization>({ sort: 'name' });
                setOrganizations(orgs);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!hasPermission('manage_users')) return;
        fetchUsers();
    }, [currentUser, activeOrganization]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            // Setup org ID based on role
            let orgId = formData.organization;
            if (!isSuperadmin) {
                orgId = currentUser?.organization || '';
            }
            if (formData.role === 'superadmin') {
                orgId = ''; // Superadmins don't belong to a single ord
            }

            const data = {
                username: formData.email.split('@')[0] + Math.floor(Math.random() * 1000), // generated
                email: formData.email,
                emailVisibility: true,
                password: formData.password,
                passwordConfirm: formData.password,
                name: formData.name,
                role: formData.role,
                organization: orgId || null
            };

            await pb.collection('users').create(data);
            await fetchUsers();
            setShowModal(false);
            
            // Reset form
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'viewer',
                organization: ''
            });
        } catch (error: any) {
            console.error('Error creating user:', error);
            alert(error.message || 'Error al crear el usuario. Verifica que el correo no esté en uso.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userToDelete: User) => {
        if (userToDelete.id === currentUser?.id) {
            alert('No puedes eliminar tu propia cuenta');
            return;
        }
        if (confirm(`¿Estás seguro de que deseas eliminar al usuario ${userToDelete.name}?`)) {
            try {
                await pb.collection('users').delete(userToDelete.id);
                setUsers(users.filter(u => u.id !== userToDelete.id));
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('No se pudo eliminar el usuario');
            }
        }
    };

    if (!hasPermission('manage_users')) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed border-slate-200 rounded-3xl">
                <Shield className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Acceso Denegado</h3>
                <p className="text-slate-500 mt-2">No tienes permiso para ver esta página.</p>
            </div>
        );
    }

    const filteredUsers = users.filter(u => 
        (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const translateRole = (role: string) => {
        switch(role) {
            case 'superadmin': return 'Superadmin';
            case 'admin': return 'Admin Local';
            case 'content_manager': return 'Gestor de Contenido';
            case 'viewer': return 'Lector';
            default: return role;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl/10">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        Usuarios
                    </h1>
                    <p className="text-slate-500 mt-1">Gestiona los accesos y roles del sistema.</p>
                </div>
                
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-primary hover:bg-[#D98201] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Usuario
                </button>
            </div>

            <div className="card-premium">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800">Lista de Usuarios</h2>
                    
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="Buscar usuario..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Usuario</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Rol</th>
                                {isSuperadmin && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Empresa</th>}
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={isSuperadmin ? 4 : 3} className="p-8 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={isSuperadmin ? 4 : 3} className="p-8 text-center text-slate-500">
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                    <UserIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{user.name}</p>
                                                    <p className="text-sm text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                                user.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                                                user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                                user.role === 'content_manager' ? 'bg-green-100 text-green-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {translateRole(user.role)}
                                            </span>
                                        </td>
                                        {isSuperadmin && (
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                    {user.role === 'superadmin' ? (
                                                        <span className="text-slate-400 italic">Global</span>
                                                    ) : (
                                                        <>
                                                            <Building2 className="w-4 h-4 text-slate-400" />
                                                            {user.expand?.organization?.name || '---'}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td className="p-4 text-right">
                                            {user.id !== currentUser?.id && (
                                                <button 
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar usuario"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setShowModal(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Nuevo Usuario</h3>
                            <button onClick={() => !isSubmitting && setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-3 px-4 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-3 px-4 outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Contraseña temporal</label>
                                <input
                                    type="text"
                                    required
                                    minLength={8}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-3 px-4 outline-none"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                                <p className="text-xs text-slate-500">Mínimo 8 caracteres</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Rol</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-3 px-4 outline-none cursor-pointer"
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value as User['role']})}
                                >
                                    {isSuperadmin && <option value="superadmin">Superadmin (Acceso Global)</option>}
                                    <option value="admin">Administrador Local</option>
                                    <option value="content_manager">Gestor de Contenido (Puede editar grupos y videos)</option>
                                    <option value="viewer">Solo Lectura</option>
                                </select>
                            </div>

                            {isSuperadmin && formData.role !== 'superadmin' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Asignar a Empresa</label>
                                    <select
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-3 px-4 outline-none cursor-pointer"
                                        value={formData.organization}
                                        onChange={e => setFormData({...formData, organization: e.target.value})}
                                    >
                                        <option value="">Seleccione...</option>
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary hover:bg-[#D98201] text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
