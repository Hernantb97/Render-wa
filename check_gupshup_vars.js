// Script para verificar y actualizar la API key de Gupshup
require('dotenv').config();
const fetch = require('node-fetch');

// Función para verificar la API key de Gupshup
async function checkGupshupApiKey() {
  console.log('🔍 Verificando configuración de Gupshup...');
  
  // Verificar si la API key está configurada
  const apiKey = process.env.GUPSHUP_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: GUPSHUP_API_KEY no está configurada en las variables de entorno');
    console.log('Por favor, configura la variable GUPSHUP_API_KEY con tu clave de API de Gupshup');
    return false;
  }
  
  console.log('✅ API key de Gupshup encontrada');
  
  // Verificar si el número de origen está configurado
  const sourceNumber = process.env.WHATSAPP_SOURCE_NUMBER;
  if (!sourceNumber) {
    console.log('⚠️ ADVERTENCIA: WHATSAPP_SOURCE_NUMBER no está configurada. Se usará el valor predeterminado +5212228557784');
  } else {
    console.log('✅ Número de origen configurado:', sourceNumber);
  }
  
  // Verificar si el nombre del negocio está configurado
  const businessName = process.env.BUSINESS_NAME;
  if (!businessName) {
    console.log('⚠️ ADVERTENCIA: BUSINESS_NAME no está configurada. Se usará el valor predeterminado "Hernán Tenorio"');
  } else {
    console.log('✅ Nombre del negocio configurado:', businessName);
  }
  
  // Realizar una prueba de envío básica
  console.log('\n🧪 Realizando prueba de envío a Gupshup...');
  
  try {
    // Configurar payload para Gupshup (sin enviar realmente un mensaje)
    const gupshupPayload = {
      channel: "whatsapp",
      source: sourceNumber || "+5212228557784",
      destination: sourceNumber || "+5212228557784", // Enviar a sí mismo para prueba
      message: {
        type: "text",
        text: "Prueba de configuración - " + new Date().toISOString()
      },
      'src.name': businessName || "Hernán Tenorio"
    };
    
    // Hacer una solicitud a Gupshup
    const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(gupshupPayload)
    });
    
    // Leer la respuesta como texto para evitar errores de parseo
    const responseText = await response.text();
    console.log('🔄 Respuesta de Gupshup (texto bruto):', responseText);
    
    // Intentar parsear la respuesta como JSON
    try {
      const responseData = JSON.parse(responseText);
      console.log('🔄 Respuesta de Gupshup (JSON):', JSON.stringify(responseData, null, 2));
      
      if (response.ok) {
        console.log('✅ La prueba de API de Gupshup fue exitosa');
        return true;
      } else {
        console.error('❌ Error al comunicarse con Gupshup:', responseData.error || 'Error desconocido');
        
        if (responseText.includes("Portal User Not Found With APIKey")) {
          console.error('❌ La API key no tiene permisos desde esta IP. Verifica restricciones de IP en el panel de Gupshup.');
        }
        
        return false;
      }
    } catch (parseError) {
      console.error('❌ Error al parsear la respuesta de Gupshup:', parseError.message);
      console.error('Respuesta no válida de Gupshup. Verifica la configuración del servidor.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error al comunicarse con Gupshup:', error.message);
    return false;
  }
}

// Ejecutar la verificación
checkGupshupApiKey()
  .then(result => {
    if (result) {
      console.log('\n🚀 Todo configurado correctamente para Gupshup');
    } else {
      console.log('\n⚠️ Hay problemas con la configuración de Gupshup. Revisa los errores anteriores.');
    }
  })
  .catch(error => {
    console.error('Error durante la verificación:', error);
  }); 