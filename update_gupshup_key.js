const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (usa las mismas credenciales de tu server.js)
const supabase = createClient(
  'https://wscijkxwevgxbgwhbqtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI'
);

// Reemplaza estos valores con los reales
const BUSINESS_ID = '2d385aa5-40e0-4ec9-9360-19281bc605e4'; // ID del negocio de Hernán Tenorio
const GUPSHUP_API_KEY = 'sk_8def1775845143bc8da6fbcfedb285c2'; // API key proporcionada

async function updateGupshupKey() {
  console.log(`Actualizando API key para el negocio ID: ${BUSINESS_ID}`);
  
  // Primero verificamos el estado actual
  const { data: before, error: errorBefore } = await supabase
    .from('businesses')
    .select('name, whatsapp_number, gupshup_api_key')
    .eq('id', BUSINESS_ID)
    .single();
    
  if (errorBefore) {
    console.error('Error obteniendo datos del negocio:', errorBefore);
    return;
  }
  
  console.log('Estado actual:');
  console.log(`- Negocio: ${before.name}`);
  console.log(`- Número WhatsApp: ${before.whatsapp_number || 'No configurado'}`);
  console.log(`- API Key Gupshup: ${before.gupshup_api_key ? 'Configurada' : 'No configurada'}`);
  
  // Actualizamos la API key
  const { data, error } = await supabase
    .from('businesses')
    .update({ 
      gupshup_api_key: GUPSHUP_API_KEY 
    })
    .eq('id', BUSINESS_ID);
    
  if (error) {
    console.error('Error al actualizar la API key:', error);
  } else {
    console.log('\n✅ API Key actualizada correctamente');
    
    // Verificamos que se haya actualizado
    const { data: after } = await supabase
      .from('businesses')
      .select('gupshup_api_key')
      .eq('id', BUSINESS_ID)
      .single();
      
    console.log(`- Nueva API Key: ${after.gupshup_api_key ? 'Configurada correctamente' : 'No se actualizó correctamente'}`);
  }
}

updateGupshupKey().catch(console.error); 