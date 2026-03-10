import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface SocialNetworksData {
    facebook: string;
    instagram: string;
    tiktok: string;
    telegram: string;
    whatsappGroup: string;
    whatsappSupport: string;
    youtube: string;
}

interface SocialNetworkContextType {
    networks: SocialNetworksData;
    updateNetwork: (key: keyof SocialNetworksData, url: string) => Promise<void>;
    removeNetwork: (key: keyof SocialNetworksData) => Promise<void>;
    loading: boolean;
}

const defaultNetworks: SocialNetworksData = {
    facebook: '',
    instagram: '',
    tiktok: '',
    telegram: '',
    whatsappGroup: '',
    whatsappSupport: '',
    youtube: ''
};

const SocialNetworkContext = createContext<SocialNetworkContextType | undefined>(undefined);

export function SocialNetworkProvider({ children }: { children: React.ReactNode }) {
    const [networks, setNetworks] = useState<SocialNetworksData>(defaultNetworks);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSocialNetworks();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchSocialNetworks();
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchSocialNetworks = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('social_networks')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching social networks:', error);
                return;
            }

            if (data?.social_networks) {
                setNetworks({ ...defaultNetworks, ...data.social_networks });
            }
        } catch (error) {
            console.error('Error in fetchSocialNetworks:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateNetwork = async (key: keyof SocialNetworksData, url: string) => {
        const newNetworks = { ...networks, [key]: url };
        setNetworks(newNetworks);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ social_networks: newNetworks })
                .eq('id', user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating social network:', error);
        }
    };

    const removeNetwork = async (key: keyof SocialNetworksData) => {
        const newNetworks = { ...networks, [key]: '' };
        setNetworks(newNetworks);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ social_networks: newNetworks })
                .eq('id', user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error removing social network:', error);
        }
    };

    return (
        <SocialNetworkContext.Provider value={{ networks, updateNetwork, removeNetwork, loading }}>
            {children}
        </SocialNetworkContext.Provider>
    );
}

export function useSocialNetworks() {
    const context = useContext(SocialNetworkContext);
    if (context === undefined) {
        throw new Error('useSocialNetworks must be used within a SocialNetworkProvider');
    }
    return context;
}
