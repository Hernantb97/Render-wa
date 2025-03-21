/**
 * Script personalizado para iniciar la aplicación en Render
 * Este script asegura que se ejecute el build antes de iniciar el servidor
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Iniciando el proceso de despliegue personalizado para Render');

// Ejecutar diagnóstico primero
console.log('📊 Ejecutando diagnóstico...');
try {
  require('./render-diagnose');
} catch (error) {
  console.log('⚠️ Error al ejecutar diagnóstico:', error);
  // Continuamos de todas formas
}

// Verificar si estamos en el directorio correcto para el build
let projectRootFound = false;
try {
  // Comprobar si estamos en el directorio correcto buscando app/ y/o next.config.*
  const hasAppDir = fs.existsSync('app') && fs.existsSync('app/page.tsx');
  const hasNextConfig = fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs');
  const hasPackageJson = fs.existsSync('package.json');
  
  projectRootFound = hasNextConfig && hasPackageJson && (hasAppDir || fs.existsSync('pages'));
  
  if (!projectRootFound) {
    console.log('❌ No estamos en el directorio raíz del proyecto Next.js');
    console.log('Buscando directorio raíz del proyecto...');
    
    // Buscar el directorio raíz del proyecto
    const findCommand = "find . -type d -name 'app' -o -name 'pages' | sort";
    const result = execSync(findCommand, { encoding: 'utf8' });
    
    if (result.trim()) {
      const possiblePaths = result.trim().split('\n');
      console.log('Posibles directorios encontrados:', possiblePaths);
      
      // Intentar cambiar al directorio que parece ser la raíz del proyecto
      for (const dirPath of possiblePaths) {
        const parentDir = path.dirname(dirPath);
        if (parentDir === '.') continue; // Ya estamos en la raíz
        
        console.log(`Intentando cambiar al directorio: ${parentDir}`);
        try {
          process.chdir(parentDir);
          console.log(`✅ Cambiado al directorio: ${process.cwd()}`);
          projectRootFound = true;
          break;
        } catch (error) {
          console.log(`❌ Error al cambiar al directorio ${parentDir}:`, error.message);
        }
      }
    }
  }
} catch (error) {
  console.log('❌ Error al buscar el directorio raíz del proyecto:', error);
}

// Verificar nuevamente después de posibles cambios de directorio
const hasAppDir = fs.existsSync('app');
const hasPagesDir = fs.existsSync('pages');
const hasNextConfig = fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs');

console.log('📁 Estado actual del proyecto:');
console.log(`- Directorio app/ existe: ${hasAppDir ? 'Sí' : 'No'}`);
console.log(`- Directorio pages/ existe: ${hasPagesDir ? 'Sí' : 'No'}`);
console.log(`- Configuración Next.js existe: ${hasNextConfig ? 'Sí' : 'No'}`);

if (!hasAppDir && !hasPagesDir) {
  console.log('❗ ADVERTENCIA: No se encontró ningún directorio app/ o pages/ válido.');
  
  // Intentar crear estructura mínima si no existe
  try {
    if (!fs.existsSync('app')) {
      console.log('🛠️ Creando estructura mínima de app/ para permitir el build...');
      fs.mkdirSync('app', { recursive: true });
      
      // Crear un layout.tsx mínimo
      fs.writeFileSync('app/layout.tsx', `
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
      `);
      
      // Crear un page.tsx mínimo
      fs.writeFileSync('app/page.tsx', `
export default function Home() {
  return (
    <main>
      <h1>Control Panel - Modo de recuperación</h1>
      <p>El panel de control está en modo de mantenimiento.</p>
    </main>
  )
}
      `);
      
      console.log('✅ Estructura mínima creada para permitir el build');
    }
  } catch (error) {
    console.error('❌ Error al crear estructura mínima:', error);
  }
}

// Verificar si existe el directorio .next
const nextDir = path.join(process.cwd(), '.next');
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