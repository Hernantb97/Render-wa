const { supabase } = require('./lib/supabase');

async function verifyMessage() {
  try {
    // First get Hernán's business_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('whatsapp_number', '+15557033313')
      .single();

    if (businessError) {
      console.error('Error finding business:', businessError);
      return;
    }

    console.log('Looking for recent messages for Hernán\'s business...');
    
    const { data: messages, error: messagesError } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (messagesError) {
      console.error('Error finding messages:', messagesError);
      return;
    }

    if (messages && messages.length > 0) {
      console.log('Last message found:');
      console.log(JSON.stringify(messages[0], null, 2));
    } else {
      console.log('No messages found for Hernán\'s business');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

verifyMessage(); 