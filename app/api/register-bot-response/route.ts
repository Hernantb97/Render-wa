import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inicializar el cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables de entorno de Supabase no configuradas');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { conversationId, message, timestamp = new Date().toISOString() } = body;
    
    if (!conversationId || !message) {
      return NextResponse.json(
        { success: false, message: 'Se requieren conversationId y message' },
        { status: 400 }
      );
    }

    console.log(`🤖 Registrando respuesta del bot para conversación ${conversationId}`);
    
    // Verificar si el conversationId es un número de teléfono
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(conversationId)) {
      console.log('El conversationId parece ser un número de teléfono, buscando conversación...');
      
      // Buscar la conversación por número de teléfono (user_id)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', conversationId)
        .order('last_message_time', { ascending: false })
        .maybeSingle();
        
      if (convError) {
        console.error('Error buscando conversación por número de teléfono:', convError);
        return NextResponse.json(
          { success: false, message: 'Error al buscar conversación', error: convError },
          { status: 500 }
        );
      }
      
      if (!conversation) {
        console.error(`No se encontró conversación para el número de teléfono ${conversationId}`);
        return NextResponse.json(
          { success: false, message: 'No se encontró conversación para este número' },
          { status: 404 }
        );
      }
      
      console.log(`Conversación encontrada con ID: ${conversation.id}`);
      conversationId = conversation.id;
    }

    // Insertar mensaje en Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          content: message,
          sender_type: 'bot',
          created_at: timestamp,
          read: true
        }
      ]);

    if (error) {
      console.error('Error al guardar respuesta del bot en Supabase:', error);
      return NextResponse.json(
        { success: false, message: 'Error al guardar en la base de datos', error },
        { status: 500 }
      );
    }

    // Actualizar la conversación con el último mensaje
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message: message,
        last_message_time: timestamp
      })
      .eq('id', conversationId);
      
    if (updateError) {
      console.error('Error al actualizar la conversación:', updateError);
      // No retornamos error para no afectar la respuesta principal
    }

    console.log(`✅ Respuesta del bot registrada correctamente`);
    return NextResponse.json(
      { success: true, message: 'Respuesta del bot registrada correctamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en endpoint /api/register-bot-response:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
} 