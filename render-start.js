/**
 * Script personalizado para iniciar la aplicación en Render
 * Este script asegura que se ejecute el build antes de iniciar el servidor
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Iniciando el proceso de despliegue personalizado para Render');

// Ejecutar diagnóstico primero
console.log('📊 Ejecutando diagnóstico básico...');
try {
  // Solo ejecutamos un diagnóstico simple, no el completo
  console.log(`Directorio actual: ${process.cwd()}`);
  console.log(`Node.js version: ${process.version}`);
  
  // Verificar archivos críticos
  const hasPackageJson = fs.existsSync('package.json');
  const hasNextConfig = fs.existsSync('next.config.mjs') || fs.existsSync('next.config.js');
  const hasAppDir = fs.existsSync('app');
  
  console.log(`package.json existe: ${hasPackageJson ? 'Sí' : 'No'}`);
  console.log(`next.config.* existe: ${hasNextConfig ? 'Sí' : 'No'}`);
  console.log(`app/ directorio existe: ${hasAppDir ? 'Sí' : 'No'}`);
  
  // Ejecutar ls -la para mejor diagnóstico
  try {
    const lsOutput = execSync('ls -la', { encoding: 'utf8' });
    console.log('Contenido del directorio:');
    console.log(lsOutput);
  } catch (error) {
    console.log(`Error al listar directorio: ${error.message}`);
  }
} catch (error) {
  console.log('⚠️ Error en diagnóstico básico:', error);
  // Continuamos de todas formas
}

// Función segura para verificar si un directorio es válido para Next.js
function isValidNextJsRoot(dir) {
  try {
    // Un directorio raíz válido debe tener package.json y uno de estos:
    // 1. Un directorio app/ con archivos dentro
    // 2. Un directorio pages/ con archivos dentro
    // 3. Un archivo next.config.js o next.config.mjs
    
    // NO consideramos ningún directorio dentro de node_modules
    if (dir.includes('node_modules')) {
      console.log(`Ignorando directorio dentro de node_modules: ${dir}`);
      return false;
    }
    
    const packageJsonPath = path.join(dir, 'package.json');
    const hasPackageJson = fs.existsSync(packageJsonPath);
    
    if (!hasPackageJson) return false;
    
    // Verificar al menos uno de los criterios de Next.js
    const appDirPath = path.join(dir, 'app');
    const pagesDirPath = path.join(dir, 'pages');
    const nextConfigJsPath = path.join(dir, 'next.config.js');
    const nextConfigMjsPath = path.join(dir, 'next.config.mjs');
    
    const hasNextConfig = fs.existsSync(nextConfigJsPath) || fs.existsSync(nextConfigMjsPath);
    const hasAppDir = fs.existsSync(appDirPath) && fs.readdirSync(appDirPath).length > 0;
    const hasPagesDir = fs.existsSync(pagesDirPath) && fs.readdirSync(pagesDirPath).length > 0;
    
    return hasNextConfig || hasAppDir || hasPagesDir;
  } catch (error) {
    console.log(`Error al verificar directorio ${dir}:`, error);
    return false;
  }
}

// NUNCA cambiamos del directorio raíz proporcionado por Render
// Simplemente verificamos si estamos en el directorio correcto
const isValidRoot = isValidNextJsRoot(process.cwd());

if (!isValidRoot) {
  console.log('⚠️ No parece que estemos en un directorio raíz válido de Next.js');
  console.log('Continuando de todas formas sin cambiar de directorio');
  
  // Intentar crear estructura mínima si no hay ninguna
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

// Si necesitamos ejecutar un servidor Express, lo hacemos aquí
if (fs.existsSync('server.js') && !fs.existsSync('next.config.mjs') && !fs.existsSync('next.config.js')) {
  console.log('🚀 Detectado servidor Express (server.js). Iniciando servidor Express...');
  try {
    require('./server.js');
    return; // Terminamos la ejecución aquí si estamos iniciando el servidor Express
  } catch (error) {
    console.error('❌ Error al iniciar servidor Express:', error);
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
    console.log('🔄 Intentando iniciar servidor Express como alternativa...');
    
    if (fs.existsSync('server.js')) {
      try {
        require('./server.js');
        return; // Terminamos la ejecución aquí
      } catch (serverError) {
        console.error('❌ Error al iniciar servidor Express:', serverError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
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