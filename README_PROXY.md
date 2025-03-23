# Actualización: Endpoint Proxy para Mensajes WhatsApp

Esta actualización agrega un nuevo endpoint al servidor de Render para actuar como proxy entre tu aplicación local y la API de Gupshup.

## Problema Resuelto

La API key de Gupshup solo funciona desde IPs autorizadas (servidores de Render), lo que causa el error "Portal User Not Found With APIKey" cuando intentas enviar mensajes desde tu entorno local.

## Solución

1. Agregar un nuevo endpoint `/send-whatsapp-message-proxy` al servidor de Render
2. Este endpoint recibe solicitudes del servidor local y las reenvía a Gupshup usando la API key autorizada
3. El servidor local guarda los mensajes en Supabase y luego los envía a través de este proxy

## Instrucciones de Uso

1. Una vez desplegado, el flujo será:
   - El usuario envía un mensaje desde el panel (entorno local)
   - El mensaje se guarda en Supabase
   - El servidor local envía una solicitud al endpoint proxy en Render
   - El servidor de Render reenvía el mensaje a WhatsApp a través de Gupshup

## Configuración Requerida en Render

Asegúrate de que estas variables de entorno estén configuradas en el servidor de Render:
- `GUPSHUP_API_KEY`: Tu clave API de Gupshup (sk_8def1775845143bc8da6fbcfedb285c2)
- `WHATSAPP_SOURCE_NUMBER` (opcional): Tu número de WhatsApp verificado
- `BUSINESS_NAME` (opcional): Nombre del negocio

## Archivo de Código

El código para esta actualización está en el archivo `whatsapp_proxy_endpoint.js` y debe ser agregado al final del archivo `server.js` existente en el servidor de Render. 