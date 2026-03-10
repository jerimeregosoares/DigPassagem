import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Campaign {
  id: string;
  slug: string;
  title: string;
  description?: string;
  ticketQuantity: number;
  ticketValue: string;
  selectionMethod: string;
  status: string;
  created?: string;
  image?: string;
  minTickets?: number;
  maxTickets?: number;
  paymentTime?: string;
  routeName?: string;
  routeDistance?: string;
  seatLayout?: { left: number, right: number }[];
  itinerary?: { dayOfWeek: string, departureTime: string, locationId?: string }[];
  locations?: { id: string, name: string, mapLink?: string }[];
  estimatedDuration?: string;
  vesselType?: string;
  vessel_lat?: number;
  vessel_lng?: number;
}

interface CampaignContextType {
  campaigns: Campaign[];
  loading: boolean;
  addCampaign: (campaign: Omit<Campaign, 'id'>) => Promise<void>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  getCampaign: (id: string) => Campaign | undefined;
  deleteCampaign: (id: string) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transportes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map DB fields to local state fields if necessary
      const mappedData = (data || []).map(item => ({
        ...item,
        ticketQuantity: item.ticket_quantity,
        ticketValue: item.ticket_value,
        selectionMethod: item.selection_method,
        minTickets: item.min_tickets,
        maxTickets: item.max_tickets,
        paymentTime: item.payment_time,
        routeName: item.route_name,
        routeDistance: item.route_distance,
        seatLayout: typeof item.seat_layout === 'string' ? JSON.parse(item.seat_layout) : (item.seat_layout || []),
        itinerary: typeof item.itinerary === 'string' ? JSON.parse(item.itinerary) : (item.itinerary || []),
        locations: typeof item.locations === 'string' ? JSON.parse(item.locations) : (item.locations || []),
        estimatedDuration: item.estimated_duration,
        vesselType: item.vessel_type,
        created: new Date(item.created_at).toLocaleString('pt-BR')
      }));

      console.log('Campaigns fetched from DB:', data);
      setCampaigns(mappedData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCampaign = async (campaign: Omit<Campaign, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('transportes')
        .insert([{
          user_id: user.id,
          slug: campaign.slug,
          title: campaign.title,
          description: campaign.description,
          ticket_quantity: campaign.ticketQuantity,
          ticket_value: campaign.ticketValue,
          selection_method: campaign.selectionMethod,
          status: campaign.status,
          image: campaign.image,
          min_tickets: campaign.minTickets,
          max_tickets: campaign.maxTickets,
          payment_time: campaign.paymentTime,
          route_name: campaign.routeName,
          route_distance: campaign.routeDistance,
          seat_layout: campaign.seatLayout || [],
          itinerary: campaign.itinerary || [],
          locations: campaign.locations || [],
          estimated_duration: campaign.estimatedDuration,
          vessel_type: campaign.vesselType
        }])
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error('Erro ao criar campanha: Nenhum dado retornado.');
      }

      await fetchCampaigns(); // Refresh list
      return data; // Retorna os dados inseridos, incluindo o ID
    } catch (error) {
      console.error('Error adding campaign:', error);
      throw error;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const dbUpdates: any = { ...updates };

      // Map local field names back to DB field names and delete camelCase keys
      if (updates.ticketQuantity !== undefined) { dbUpdates.ticket_quantity = updates.ticketQuantity; delete dbUpdates.ticketQuantity; }
      if (updates.ticketValue !== undefined) { dbUpdates.ticket_value = updates.ticketValue; delete dbUpdates.ticketValue; }
      if (updates.selectionMethod !== undefined) { dbUpdates.selection_method = updates.selectionMethod; delete dbUpdates.selectionMethod; }
      if (updates.minTickets !== undefined) { dbUpdates.min_tickets = updates.minTickets; delete dbUpdates.minTickets; }
      if (updates.maxTickets !== undefined) { dbUpdates.max_tickets = updates.maxTickets; delete dbUpdates.maxTickets; }
      if (updates.paymentTime !== undefined) { dbUpdates.payment_time = updates.paymentTime; delete dbUpdates.paymentTime; }
      if (updates.routeName !== undefined) { dbUpdates.route_name = updates.routeName; delete dbUpdates.routeName; }
      if (updates.routeDistance !== undefined) { dbUpdates.route_distance = updates.routeDistance; delete dbUpdates.routeDistance; }
      if (updates.seatLayout !== undefined) { dbUpdates.seat_layout = updates.seatLayout; delete dbUpdates.seatLayout; }
      if (updates.estimatedDuration !== undefined) { dbUpdates.estimated_duration = updates.estimatedDuration; delete dbUpdates.estimatedDuration; }
      if (updates.vesselType !== undefined) { dbUpdates.vessel_type = updates.vesselType; delete dbUpdates.vesselType; }
      
      // IMPORTANT: Do NOT delete itinerary or locations as they map 1:1 or are handled by spread
      // if (updates.itinerary !== undefined) { dbUpdates.itinerary = updates.itinerary; }
      // if (updates.locations !== undefined) { dbUpdates.locations = updates.locations; }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('Tentando atualizar campanha (v2):', id, dbUpdates);
      console.log('Usuário Logado:', user?.id);

      // Verificação de segurança local para debug
      const { data: checkOwner } = await supabase
        .from('transportes')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();

      console.log('[DEBUG RLS] Info:', {
        campaignId: id,
        campaignOwner: checkOwner?.user_id,
        currentUser: user?.id,
        match: checkOwner?.user_id === user?.id
      });

      if (checkOwner && user?.id && checkOwner.user_id !== user.id) {
        console.warn(`[CRÍTICO] Mismatch de Usuário! Dono da embarcação: ${checkOwner.user_id} vs Usuário Atual: ${user.id}`);
        throw new Error('Permissão negada: Você não é o dono desta campanha.');
      }

      const { data, error } = await supabase
        .from('transportes')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro no Supabase ao atualizar campanha:', error);
        throw error;
      }

      if (!data) {
        const msg = `A atualização não foi salva. Verifique se você é o dono desta embarcação.`;
        console.warn(`Atenção: A atualização da embarcação ${id} não retornou dados.`, msg);
        throw new Error(msg);
      }

      console.log('Campanha atualizada com sucesso no banco (DADOS RETORNADOS):', data);
      console.log('ITINERÁRIO NO BANCO APÓS UPDATE:', data.itinerary);

      // Force refresh all campaigns to ensure consistency
      await fetchCampaigns();
      
      // Retorna true para indicar sucesso real
      return true;

    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  };

  const getCampaign = (id: string) => {
    return campaigns.find(c => c.id === id || c.slug === id);
  };

  const deleteCampaign = async (idOrSlug: string) => {
    try {
      // Resolve o ID real caso tenha sido passado o slug
      const target = getCampaign(idOrSlug);
      const actualId = target ? target.id : idOrSlug;

      const { error } = await supabase
        .from('transportes')
        .delete()
        .eq('id', actualId);

      if (error) throw error;

      setCampaigns(prev => prev.filter(c => c.id !== actualId));
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  };

  return (
    <CampaignContext.Provider value={{
      campaigns,
      loading,
      addCampaign,
      updateCampaign,
      getCampaign,
      deleteCampaign,
      refreshCampaigns: fetchCampaigns
    }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
