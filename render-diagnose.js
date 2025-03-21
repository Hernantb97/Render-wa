/**
 * Script de diagnóstico para problemas de despliegue en Render
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Función para imprimir el contenido de un directorio recursivamente
function listDirContents(dir, depth = 0, maxDepth = 2) {
  if (depth > maxDepth) return;
  
  try {
    const items = fs.readdirSync(dir);
    console.log(`${' '.repeat(depth * 2)}📁 ${dir}`);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        listDirContents(itemPath, depth + 1, maxDepth);
      } else {
        console.log(`${' '.repeat((depth + 1) * 2)}📄 ${item} (${stats.size} bytes)`);
      }
    }
  } catch (error) {
    console.log(`${' '.repeat(depth * 2)}❌ Error al leer ${dir}: ${error.message}`);
  }
}

// Información del entorno
console.log('🔍 DIAGNÓSTICO DE ENTORNO RENDER');
console.log('===============================\n');

console.log('📊 Información del sistema:');
console.log('-------------------------');
console.log(`Directorio actual: ${process.cwd()}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Plataforma: ${process.platform}`);
console.log(`Arquitectura: ${process.arch}`);
console.log(`Variables de entorno relevantes:`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'no definido'}`);
console.log(`  - PWD: ${process.env.PWD || 'no definido'}`);
console.log('');

// Verificación de next.config.js o next.config.mjs
console.log('📋 Verificación de configuración Next.js:');
console.log('-------------------------------------');
const nextConfigPath = fs.existsSync('next.config.js') 
  ? 'next.config.js' 
  : fs.existsSync('next.config.mjs') 
    ? 'next.config.mjs' 
    : null;

if (nextConfigPath) {
  console.log(`✅ ${nextConfigPath} encontrado`);
  try {
    const config = fs.readFileSync(nextConfigPath, 'utf8');
    console.log(`Contenido de ${nextConfigPath}:`);
    console.log('```');
    console.log(config);
    console.log('```');
  } catch (error) {
    console.log(`❌ Error al leer ${nextConfigPath}: ${error.message}`);
  }
} else {
  console.log('❌ No se encontró archivo de configuración next.config.js o next.config.mjs');
}
console.log('');

// Estructura de directorios
console.log('📂 Estructura de directorios:');
console.log('-------------------------');
console.log('Mostrando estructura de carpetas principales:');
listDirContents(process.cwd(), 0, 1);
console.log('');

// Estructura específica de app y pages
console.log('📂 Verificación de directorios específicos:');
console.log('-------------------------------------');

if (fs.existsSync('app')) {
  console.log('✅ Directorio app/ existe');
  listDirContents('app', 0, 1);
} else {
  console.log('❌ Directorio app/ no existe');
}

if (fs.existsSync('pages')) {
  console.log('✅ Directorio pages/ existe');
  listDirContents('pages', 0, 1);
} else {
  console.log('❌ Directorio pages/ no existe');
}
console.log('');

// Verificación de package.json
console.log('📦 Verificación de package.json:');
console.log('----------------------------');
if (fs.existsSync('package.json')) {
  try {
    const packageJson = require('./package.json');
    console.log('✅ package.json encontrado');
    console.log(`Nombre: ${packageJson.name}`);
    console.log(`Versión: ${packageJson.version}`);
    console.log('Scripts:');
    for (const [key, value] of Object.entries(packageJson.scripts || {})) {
      console.log(`  - ${key}: ${value}`);
    }
    console.log('Dependencias relevantes:');
    console.log(`  - next: ${packageJson.dependencies?.next || 'no definido'}`);
    console.log(`  - react: ${packageJson.dependencies?.react || 'no definido'}`);
    console.log(`  - react-dom: ${packageJson.dependencies?.['react-dom'] || 'no definido'}`);
  } catch (error) {
    console.log(`❌ Error al leer package.json: ${error.message}`);
  }
} else {
  console.log('❌ No se encontró package.json');
}
console.log('');

console.log('🧪 Ejecutando pruebas adicionales:');
console.log('-----------------------------');
try {
  const lsOutput = execSync('ls -la', { encoding: 'utf8' });
  console.log('Resultado de ls -la:');
  console.log('```');
  console.log(lsOutput);
  console.log('```');
} catch (error) {
  console.log(`❌ Error al ejecutar ls -la: ${error.message}`);
}

try {
  const findOutput = execSync('find . -type d -name "app" -o -name "pages" | sort', { encoding: 'utf8' });
  console.log('Búsqueda de directorios app y pages:');
  console.log('```');
  console.log(findOutput || 'No se encontraron resultados');
  console.log('```');
} catch (error) {
  console.log(`❌ Error al ejecutar búsqueda: ${error.message}`);
}

console.log('\n✅ Diagnóstico completado'); 