import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface PixManualConfig {
    keyType: string;
    pixKey: string;
    accountHolder: string;
    isConfigured: boolean;
    isActive: boolean; // Added isActive to control manual pix visibility
}

export interface N8NConfig {
    createUrl: string;
    checkUrl: string;
    isActive: boolean;
}

interface PaymentContextType {
    pixManual: PixManualConfig;
    setPixManual: (config: PixManualConfig) => Promise<void>;
    n8nConfig: N8NConfig;
    setN8NConfig: (config: N8NConfig) => Promise<void>;
    activeMethod: 'pixManual' | 'n8n' | null;
    setActiveMethod: (method: 'pixManual' | 'n8n' | null) => Promise<void>;
    loading: boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    
    // Pix Manual State
    const [pixManual, setPixManualState] = useState<PixManualConfig>(() => {
        const saved = localStorage.getItem('pix_manual_config');
        return saved ? JSON.parse(saved) : {
            keyType: '',
            pixKey: '',
            accountHolder: '',
            isConfigured: false,
            isActive: false
        };
    });

    // N8N State
    const [n8nConfig, setN8NConfigState] = useState<N8NConfig>(() => {
        const saved = localStorage.getItem('n8n_config');
        return saved ? JSON.parse(saved) : {
            createUrl: '',
            checkUrl: '',
            isActive: false
        };
    });

    const [activeMethod, setActiveMethodState] = useState<'pixManual' | 'n8n' | null>(null);

    useEffect(() => {
        fetchPaymentConfig();

        // Listen for auth changes to reload config
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchPaymentConfig();
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Determine active method on load based on config
        if (n8nConfig.isActive) setActiveMethodState('n8n');
        else if (pixManual.isActive) setActiveMethodState('pixManual');
        else setActiveMethodState(null);
    }, [n8nConfig.isActive, pixManual.isActive]);

    const fetchPaymentConfig = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('payment_methods_config')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching payment config:', error);
                return;
            }

            if (data?.payment_methods_config) {
                const config = data.payment_methods_config;
                
                if (config.pixManual) {
                    setPixManualState(config.pixManual);
                    localStorage.setItem('pix_manual_config', JSON.stringify(config.pixManual));
                }
                
                if (config.n8nConfig) {
                    setN8NConfigState(config.n8nConfig);
                    localStorage.setItem('n8n_config', JSON.stringify(config.n8nConfig));
                }
            }
        } catch (error) {
            console.error('Error in fetchPaymentConfig:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateProfileConfig = async (newConfig: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('payment_methods_config')
                .eq('id', user.id)
                .maybeSingle();

            const currentConfig = profile?.payment_methods_config || {};
            
            const { error } = await supabase
                .from('profiles')
                .update({
                    payment_methods_config: {
                        ...currentConfig,
                        ...newConfig
                    }
                })
                .eq('id', user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving payment config:', error);
        }
    };

    const setPixManual = async (config: PixManualConfig) => {
        // If activating Pix Manual, deactivate N8N
        let newN8NConfig = { ...n8nConfig };
        if (config.isActive) {
            newN8NConfig.isActive = false;
            setN8NConfigState(newN8NConfig);
            localStorage.setItem('n8n_config', JSON.stringify(newN8NConfig));
        }

        setPixManualState(config);
        localStorage.setItem('pix_manual_config', JSON.stringify(config));

        await updateProfileConfig({
            pixManual: config,
            n8nConfig: newN8NConfig
        });
    };

    const setN8NConfig = async (config: N8NConfig) => {
        // If activating N8N, deactivate Pix Manual
        let newPixConfig = { ...pixManual };
        if (config.isActive) {
            newPixConfig.isActive = false;
            setPixManualState(newPixConfig);
            localStorage.setItem('pix_manual_config', JSON.stringify(newPixConfig));
        }

        setN8NConfigState(config);
        localStorage.setItem('n8n_config', JSON.stringify(config));

        await updateProfileConfig({
            n8nConfig: config,
            pixManual: newPixConfig
        });
    };

    const setActiveMethod = async (method: 'pixManual' | 'n8n' | null) => {
        if (method === 'n8n') {
            await setN8NConfig({ ...n8nConfig, isActive: true });
        } else if (method === 'pixManual') {
            await setPixManual({ ...pixManual, isActive: true });
        } else {
            // Deactivate both
            await setN8NConfig({ ...n8nConfig, isActive: false });
            await setPixManual({ ...pixManual, isActive: false });
        }
        setActiveMethodState(method);
    };

    return (
        <PaymentContext.Provider value={{ 
            pixManual, setPixManual, 
            n8nConfig, setN8NConfig,
            activeMethod, setActiveMethod,
            loading 
        }}>
            {children}
        </PaymentContext.Provider>
    );
}

export function usePayment() {
    const context = useContext(PaymentContext);
    if (context === undefined) {
        throw new Error('usePayment must be used within a PaymentProvider');
    }
    return context;
}
