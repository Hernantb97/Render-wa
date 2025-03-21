/**
 * Servicio de IA para el panel de control
 * Archivo creado para evitar errores de importación en server.js
 */

// Función simple que indica si la IA debería responder a un mensaje
function shouldAIRespond(message, context = {}) {
  // Por defecto, no usamos respuestas automáticas
  return false;
}

// Función para generar respuestas de IA (stub)
async function generateAIResponse(message, context = {}) {
  // Respuesta por defecto
  return {
    text: "Esta es una respuesta automática del sistema. La IA no está habilitada en este entorno.",
    generated: true
  };
}

module.exports = {
  shouldAIRespond,
  generateAIResponse
}; 