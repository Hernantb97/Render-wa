/**
 * Script de prueba para enviar un mensaje usando la API de Gupshup
 * 
 * Uso: 
 * 1. Configura tus variables de entorno o modifica este archivo con tus claves
 * 2. Ejecuta: node test_gupshup_api.js
 */

// Puedes usar dotenv para cargar variables de entorno
// require('dotenv').config();

const fetch = require('node-fetch');

// Configura estos valores
const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY || 'sk_8def1775845143bc8da6fbcfedb285c2'; // Reemplaza con tu API key
const SOURCE_NUMBER = process.env.SOURCE_NUMBER || '+5212228557784'; // Número de origen registrado en Gupshup
const DESTINATION_NUMBER = process.env.DESTINATION_NUMBER || '+5212228557784'; // Número de destino para la prueba
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Hernán Tenorio';

async function sendTestMessage() {
  try {
    console.log('Enviando mensaje de prueba a Gupshup...');
    
    const gupshupPayload = {
      channel: "whatsapp",
      source: SOURCE_NUMBER,
      destination: DESTINATION_NUMBER,
      message: {
        type: "text",
        text: "Este es un mensaje de prueba enviado directamente a la API de Gupshup " + new Date().toISOString()
      },
      'src.name': BUSINESS_NAME
    };
    
    console.log('Payload:', JSON.stringify(gupshupPayload, null, 2));
    
    const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': GUPSHUP_API_KEY
      },
      body: JSON.stringify(gupshupPayload)
    });
    
    const responseText = await response.text();
    console.log('Respuesta de Gupshup (texto):', responseText);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('Respuesta de Gupshup (JSON):', responseData);
    } catch (e) {
      console.error('Error al parsear respuesta como JSON');
    }
    
    console.log('Código de estado:', response.status);
    console.log('Prueba completada');
    
  } catch (error) {
    console.error('Error al enviar mensaje de prueba:', error);
  }
}

sendTestMessage(); 