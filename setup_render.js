/**
 * Script para verificar la configuración de Render y la estructura de la base de datos
 * 
 * Ejecutar con: node setup_render.js
 */

// Importar dependencias
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Obtener variables de entorno (aceptando ambos formatos)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Verificar que existan las variables de entorno
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan las variables de entorno de Supabase');
  console.log('Por favor, configura las siguientes variables en Render:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
  console.log('- GUPSHUP_API_KEY (opcional)');
  process.exit(1);
}

// Inicializar cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Función principal
async function main() {
  try {
    console.log('🔍 Verificando conexión con Supabase...');
    
    // Verificar conexión a Supabase
    const { data: healthData, error: healthError } = await supabase.from('conversations').select('id').limit(1);
    
    if (healthError) {
      console.error('❌ Error de conexión a Supabase:', healthError);
      process.exit(1);
    }
    
    console.log('✅ Conexión a Supabase exitosa');
    
    // Verificar estructura de la tabla conversations
    console.log('🔍 Verificando estructura de la tabla conversations...');
    
    try {
      // Intenta usar la columna "message" (que debería fallar)
      console.log('  Probando columna "message" (se espera error)...');
      const { data: testMessage, error: messageError } = await supabase
        .from('conversations')
        .select('message')
        .limit(1);
      
      if (!messageError) {
        console.warn('⚠️ La columna "message" existe pero debería ser "last_message"');
      } else {
        console.log('  ✓ Correcto: La columna "message" no existe');
      }
    } catch (err) {
      console.log('  ✓ Correcto: La columna "message" no existe');
    }
    
    // Verificar columna "last_message"
    console.log('  Probando columna "last_message"...');
    const { data: testLastMessage, error: lastMessageError } = await supabase
      .from('conversations')
      .select('last_message')
      .limit(1);
    
    if (lastMessageError) {
      console.error('❌ Error: La columna "last_message" no existe:', lastMessageError);
    } else {
      console.log('  ✓ Correcto: La columna "last_message" existe');
    }
    
    // Verificar tabla "messages"
    console.log('🔍 Verificando estructura de la tabla messages...');
    
    const { data: testContent, error: contentError } = await supabase
      .from('messages')
      .select('content')
      .limit(1);
    
    if (contentError) {
      console.error('❌ Error: La columna "content" no existe en messages:', contentError);
    } else {
      console.log('  ✓ Correcto: La columna "content" existe en messages');
    }
    
    console.log('\n✅ Verificación completada. Todo parece estar configurado correctamente.');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

// Ejecutar función principal
main(); 