
export interface Purchase {
  id: string;
  cliente_id: string;
  transporte_id: string;
  tickets: number[];
  total_value: number;
  status: 'pending' | 'approved' | 'cancelled';
  proof_url?: string;
  created_at: string;
  clientes?: {
    name: string;
    phone: string;
    email?: string;
  };
}

/**
 * Valida e formata o número de telefone para o padrão internacional (apenas números).
 * Assume Brasil (55) se não houver código de país, mas tenta ser inteligente.
 * @param phone Número de telefone bruto
 * @returns Número formatado (apenas dígitos) ou null se inválido
 */
export function validatePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove tudo que não é dígito
  const cleanPhone = phone.replace(/\D/g, '');

  // Validação básica de comprimento
  // Brasil: 55 + DDD (2) + 9 + 8 dígitos = 13 dígitos (ou 12 sem o 9 extra em alguns casos antigos, mas raro hoje em dia mobile)
  // Aceita entre 10 e 15 dígitos para ser flexível com outros países
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return null;
  }

  // Se começar com 55 e tiver comprimento correto, ok.
  // Se não começar com 55, mas tiver 10 ou 11 dígitos (DDD + número), adiciona 55.
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    return `55${cleanPhone}`;
  }

  return cleanPhone;
}

/**
 * Gera a mensagem do WhatsApp baseada no status do pedido.
 * @param purchase Objeto da compra
 * @param origin URL de origem (window.location.origin) para montar o link
 * @returns Mensagem formatada
 */
export function generateWhatsAppMessage(purchase: Purchase, origin: string): string {
  const customerName = purchase.clientes?.name || 'Cliente';
  const link = `${origin}/r/${purchase.id}`;

  // Placeholders para URLs de imagens (seriam substituídos por URLs reais de armazenamento se disponíveis)
  // Como o usuário pediu para "enviar o link concatenado com a imagem", vamos simular isso na mensagem.
  // Na prática, o WhatsApp só pré-visualiza o link da compra.

  let message = '';

  if (purchase.status === 'cancelled') {
    // Regra 1: Cancelado ou expirado -> Imagem 1 (Modelo de tela cancelada)
    message = `Olá ${customerName}, notamos que sua compra foi cancelada ou expirou. 🔴\n\nVocê pode tentar comprar novamente acessando o link abaixo:\n\n ${link} \n\n`;
  } else if (purchase.status === 'approved') {
    // Regra 4: Aprovado -> Imagem 4 (Modelo de tela aprovada)
    message = `Olá ${customerName}, parabéns! Sua compra foi aprovada com sucesso! ✅\n\nConfira seus passagens no link:\n\n ${link} \n\n`;
  } else if (purchase.status === 'pending') {
    if (purchase.proof_url) {
      // Regra 2: Pendente de confirmação (com comprovante) -> Imagem 2/3 (Modelo de tela em análise)
      message = `Olá ${customerName}, recebemos seu comprovante! Estamos analisando seu pagamento. 🕒\n\nAcompanhe o status pelo link:\n\n ${link} \n\n`;
    } else {
      // Regra 3: Cliente ainda não enviou comprovante -> Imagem 3 (Modelo de tela pagamento manual/anexo)
      message = `Olá ${customerName}, finalize seu pagamento para garantir seus passagens! 💸\n\nEnvie o comprovante ou realize o pagamento pelo link:\n\n ${link} \n\n`;
    }
  } else {
    // Fallback
    message = `Olá ${customerName}, acompanhe sua compra no link:\n\n ${link} \n\n`;
  }

  return encodeURIComponent(message);
}

/**
 * Abre o WhatsApp com a mensagem pré-preenchida.
 * @param phone Número de telefone validado
 * @param message Mensagem codificada
 */
export function openWhatsApp(phone: string, message: string) {
  // Detecta se é mobile para usar api.whatsapp.com ou web.whatsapp.com (embora wa.me funcione para ambos)
  // wa.me é o padrão mais robusto.
  const url = `https://wa.me/${phone}?text=${message}`;
  window.open(url, '_blank');
}

/**
 * Log de auditoria simulado (console)
 */
export function logAudit(action: string, details: any) {
  const timestamp = new Date().toISOString();
  console.info(`[AUDIT ${timestamp}] ${action}:`, details);
  // Aqui poderia ser uma chamada para supabase.from('audit_logs').insert(...)
}
