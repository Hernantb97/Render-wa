import { NextResponse } from 'next/server';

// Ruta simple de prueba para verificar la conexión del bot
export async function GET() {
  console.log('🧪 GET a /api/test-bot recibido');
  return NextResponse.json({
    success: true,
    message: 'API de prueba del bot funcionando correctamente',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('🧪 POST a /api/test-bot recibido', JSON.stringify(body, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Datos recibidos correctamente por la API Next.js',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error en endpoint /api/test-bot:', error);
    return NextResponse.json(
      { success: false, message: 'Error al procesar la solicitud', error: error.message },
      { status: 500 }
    );
  }
} 