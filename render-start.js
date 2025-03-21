/**
 * Script personalizado para iniciar la aplicación en Render
 * Este script asegura que se ejecute el build antes de iniciar el servidor
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Iniciando el proceso de despliegue personalizado para Render');

// Verificar si existe el directorio .next
const nextDir = path.join(__dirname, '.next');
if (!fs.existsSync(nextDir) || !fs.existsSync(path.join(nextDir, 'build-manifest.json'))) {
  console.log('📦 El directorio .next no existe o está incompleto. Ejecutando next build...');
  
  try {
    // Ejecutar next build de forma sincrónica
    execSync('npx next build', { stdio: 'inherit' });
    console.log('✅ Build completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el build:', error);
    process.exit(1);
  }
} else {
  console.log('✅ Directorio .next ya existe con un build válido');
}

// Iniciar el servidor Next.js
console.log('🚀 Iniciando el servidor Next.js...');
const nextStart = spawn('npx', ['next', 'start'], { 
  stdio: 'inherit',
  env: { ...process.env }
});

// Manejar la finalización del proceso
nextStart.on('close', (code) => {
  console.log(`Proceso next start finalizado con código ${code}`);
  process.exit(code);
});

// Manejar señales para cierre graceful
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`Recibida señal ${signal}, cerrando servidor...`);
    nextStart.kill(signal);
  });
}); 