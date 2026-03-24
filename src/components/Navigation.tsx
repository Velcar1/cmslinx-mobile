import { Link, useLocation } from 'react-router-dom';
import { MonitorPlay, Folder, Image, List, Settings, LayoutDashboard, Building2, ChevronDown, Plus, Loader2, X, Users, LogOut, Menu, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { pb } from '../lib/pocketbase';

export default function Navigation() {
    const location = useLocation();
    const { organizations, activeOrganization, setActiveOrganization, isLoading: isOrgLoading, refreshOrganizations } = useOrganization();
    const { user, hasPermission, logout } = useAuth();
    const { t } = useLanguage();
    
    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
    const [showNewOrgModal, setShowNewOrgModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu when location changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Close mobile menu when window is resized to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const canManageOrgs = hasPermission('manage_organizations');
    const canManageUsers = hasPermission('manage_users');
    const canManageContent = hasPermission('manage_content');

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;

        setIsCreatingOrg(true);
        try {
            const record = await pb.collection('organizations').create({
                name: newOrgName
            });
            await refreshOrganizations();
            setActiveOrganization(record as any);
            setShowNewOrgModal(false);
            setNewOrgName('');
            setIsOrgDropdownOpen(false);
        } catch (error) {
            console.error('Error creating organization:', error);
            alert('Error al crear la organización');
        } finally {
            setIsCreatingOrg(false);
        }
    };

    const navItems = [
        { path: '/', label: t('common.dashboard'), icon: LayoutDashboard, show: true },
        { path: '/publish', label: t('common.publish') || 'Publicar', icon: Send, show: canManageContent },
        { path: '/devices', label: t('common.screens'), icon: MonitorPlay, show: true },
        { path: '/groups', label: t('common.groups'), icon: Folder, show: true },
        { path: '/media', label: t('common.media'), icon: Image, show: true },
        { path: '/playlists', label: t('common.playlists'), icon: List, show: true },
        { path: '/users', label: t('common.users'), icon: Users, show: canManageUsers },
    ];

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-white/5 flex items-center justify-between px-6 z-[60]">
                <div className="flex items-center gap-2">
                    <img src="/logo-sidebar.png" alt="L1NX Logo" className="h-14 w-auto object-contain" />
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/10"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Backdrop for Mobile */}
            {isMobileMenuOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <nav className={`
                fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-slate-300 flex flex-col z-[58] transition-all duration-300 ease-in-out border-r border-white/5
                ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
            `}>
            {/* Logo Section */}
            <div className="p-4 pb-2 flex justify-center">
                <div className="flex items-center justify-center w-full">
                    <img src="/logo-sidebar.png" alt="L1NX Logo" className="w-[80%] h-auto max-h-28 object-contain" />
                </div>
            </div>

            {/* Organization Selector */}
            {canManageOrgs ? (
                <div className="px-4 mb-6 relative">
                    <button 
                        onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-left group"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{t('common.status').toLowerCase() === 'estado' ? 'Empresa' : 'Company'}</p>
                                <p className="text-sm font-bold text-white truncate">
                                    {isOrgLoading ? t('common.loading') : (activeOrganization?.name || t('settings.selectLanguage'))}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOrgDropdownOpen && (
                        <div className="absolute top-full left-4 right-4 mt-2 bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl z-[60] py-2 max-h-64 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2">
                            {organizations.map((org) => (
                                <button
                                    key={org.id}
                                    onClick={() => {
                                        setActiveOrganization(org);
                                        setIsOrgDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left ${activeOrganization?.id === org.id ? 'text-primary' : 'text-slate-300'}`}
                                >
                                    <Building2 className="w-4 h-4 shrink-0" />
                                    <span className="text-sm font-medium truncate">{org.name}</span>
                                </button>
                            ))}
                            <div className="h-px bg-white/5 mx-2 my-2" />
                             <button
                                onClick={() => {
                                    setShowNewOrgModal(true);
                                    setIsOrgDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-primary hover:bg-primary/5 transition-colors text-left"
                            >
                                <Plus className="w-4 h-4 shrink-0" />
                                <span className="text-sm font-bold truncate">{t('common.create')} {t('common.status').toLowerCase() === 'estado' ? 'Empresa' : 'Company'}</span>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="px-4 mb-6">
                    <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 transition-all border border-white/5 text-left opacity-90">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Empresa</p>
                                <p className="text-sm font-bold text-white truncate">
                                    {isOrgLoading ? 'Cargando...' : (activeOrganization?.name || 'Cargando...')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nav Items */}
            <div className="flex-1 px-4 space-y-2">
                {navItems.filter(item => item.show).map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group
                                ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`} />
                            <span className="text-[15px]">{item.label}</span>
                        </Link>
                    );
                })}
            </div>

             {/* Bottom Section */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <div className="px-4 py-2 mb-2 flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('common.user')}</span>
                    <span className="text-sm text-slate-300 font-medium truncate">{user?.name || user?.email}</span>
                </div>
                
                 <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-[15px]">{t('common.settings')}</span>
                </Link>

                <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-400 hover:bg-red-400/10 transition-all text-left"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[15px]">{t('common.logout')}</span>
                </button>
            </div>

            {/* New Org Modal */}
            {showNewOrgModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNewOrgModal(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800">Nueva Empresa</h3>
                                <button onClick={() => setShowNewOrgModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateOrganization} className="space-y-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block uppercase tracking-wider">Nombre de la Organización</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        placeholder="Ej: Mi Empresa S.A."
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-4 px-5 outline-none transition-all text-slate-800 text-lg"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isCreatingOrg}
                                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                                >
                                    {isCreatingOrg ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                                    Crear Empresa
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </nav>
      </>
    );
}
