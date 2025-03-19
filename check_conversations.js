const { supabase } = require('./lib/supabase');

async function checkConversations() {
  try {
    // Primero obtenemos el business_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('whatsapp_number', '+15557033313')
      .single();

    if (businessError) {
      console.error('Error obteniendo business:', businessError);
      return;
    }

    console.log('Business ID:', business.id);

    // Luego obtenemos todas las conversaciones
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', business.id)
      .order('last_message_time', { ascending: false });

    if (convError) {
      console.error('Error obteniendo conversaciones:', convError);
      return;
    }

    console.log('Conversaciones encontradas:', conversations.length);
    console.log('Conversaciones:', JSON.stringify(conversations, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

checkConversations(); 