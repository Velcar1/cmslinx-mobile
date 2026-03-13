import React, { createContext, useContext, useState, useEffect } from 'react';
import { pb, type Organization } from '../lib/pocketbase';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
    organizations: Organization[];
    activeOrganization: Organization | null;
    setActiveOrganization: (org: Organization | null) => void;
    isLoading: boolean;
    refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [activeOrganization, setActiveOrgState] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    const fetchOrganizations = async () => {
        if (!user) {
            setOrganizations([]);
            setActiveOrgState(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            if (user.role !== 'superadmin' && user.organization) {
                // Fetch only the user's assigned organization
                const record = await pb.collection('organizations').getOne<Organization>(user.organization);
                setOrganizations([record]);
                setActiveOrgState(record);
            } else {
                // Superadmin can fetch all organizations
                const records = await pb.collection('organizations').getFullList<Organization>({
                    sort: 'name',
                });
                setOrganizations(records);

                // Restore from localStorage or pick first
                const savedOrgId = localStorage.getItem('active_org_id');
                if (savedOrgId) {
                    const savedOrg = records.find(o => o.id === savedOrgId);
                    if (savedOrg) {
                        setActiveOrgState(savedOrg);
                        return; // Found saved org, we're done here
                    }
                }
                
                if (records.length > 0) {
                    setActiveOrganization(records[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setActiveOrganization = (org: Organization | null) => {
        setActiveOrgState(org);
        if (org) {
            localStorage.setItem('active_org_id', org.id);
        } else {
            localStorage.removeItem('active_org_id');
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, [user]);

    return (
        <OrganizationContext.Provider value={{ 
            organizations, 
            activeOrganization, 
            setActiveOrganization, 
            isLoading, 
            refreshOrganizations: fetchOrganizations 
        }}>
            {children}
        </OrganizationContext.Provider>
    );
};

export const useOrganization = () => {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
};
