/**
 * Script para verificar la configuración de rutas en el servidor
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Función para hacer una solicitud HTTP/HTTPS y devolver una promesa
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Función principal para verificar las rutas
async function verifyRoutes() {
  console.log('🔍 Verificando rutas y configuración del servidor...\n');
  
  // Obtener la URL base del servidor (ya sea local o en producción)
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction 
    ? process.env.RENDER_EXTERNAL_URL || 'https://render-wa.onrender.com' 
    : 'http://localhost:3000';
  
  console.log(`🌐 URL base del servidor: ${baseUrl}`);
  
  // Prueba de rutas
  const routesToTest = [
    { path: '/', method: 'GET', name: 'Página principal' },
    { path: '/api/test-bot', method: 'POST', name: 'API de prueba del bot', data: { test: 'mensaje de prueba' } },
    { path: '/test-bot', method: 'POST', name: 'Ruta simplificada de prueba', data: { test: 'mensaje de prueba' } },
    { path: '/api/register-bot-response', method: 'POST', name: 'API para registrar respuestas', data: { conversationId: 'test-id', message: 'Mensaje de prueba' } },
    { path: '/register-bot-response', method: 'POST', name: 'Ruta simplificada para registrar', data: { conversationId: 'test-id', message: 'Mensaje de prueba' } }
  ];
  
  console.log('\n📋 Resultados de las pruebas:');
  console.log('-------------------------\n');
  
  for (const route of routesToTest) {
    try {
      const url = `${baseUrl}${route.path}`;
      const data = route.data ? JSON.stringify(route.data) : null;
      
      console.log(`🧪 Probando ${route.name}: ${route.method} ${url}`);
      
      const response = await makeRequest(url, route.method, data);
      
      console.log(`   📊 Código de estado: ${response.statusCode}`);
      console.log(`   📄 Respuesta: ${response.body.substring(0, 150)}${response.body.length > 150 ? '...' : ''}`);
      console.log();
    } catch (error) {
      console.error(`   ❌ Error probando ${route.path}: ${error.message}`);
      console.log();
    }
  }
  
  // Verificar configuración
  console.log('\n⚙️ Información del sistema:');
  console.log('-------------------------\n');
  console.log(`📂 Directorio de trabajo: ${process.cwd()}`);
  console.log(`🖥️ Sistema operativo: ${os.type()} ${os.release()}`);
  console.log(`🧠 Memoria disponible: ${Math.round(os.freemem() / 1024 / 1024)} MB de ${Math.round(os.totalmem() / 1024 / 1024)} MB`);
  
  // Verificar archivos de configuración clave
  const configFiles = [
    { path: '.env', label: 'Variables de entorno' },
    { path: 'middleware.ts', label: 'Middleware de Next.js' },
    { path: 'render.yaml', label: 'Configuración de Render' },
    { path: 'app/api/register-bot-response/route.ts', label: 'API de registro de respuestas' },
    { path: 'app/api/test-bot/route.ts', label: 'API de prueba' }
  ];
  
  console.log('\n📄 Archivos de configuración:');
  console.log('-------------------------\n');
  
  for (const file of configFiles) {
    try {
      const exists = fs.existsSync(file.path);
      console.log(`${exists ? '✅' : '❌'} ${file.label}: ${file.path}`);
    } catch (error) {
      console.error(`❌ Error verificando ${file.path}: ${error.message}`);
    }
  }
  
  console.log('\n🏁 Verificación completa.');
}

// Ejecutar la función principal
verifyRoutes().catch(console.error); 