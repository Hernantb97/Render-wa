// Función para obtener las conversaciones del usuario
export async function fetchUserConversations(userId: string) {
  // En una implementación real, esta función haría una llamada a tu API
  // para obtener las conversaciones del usuario desde la base de datos

  // Simulamos una respuesta para el ejemplo
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "1",
          name: "Soporte Técnico",
          lastMessage: "Gracias por contactarnos. ¿En qué podemos ayudarte hoy?",
          time: "Hace 5 min",
          unread: true,
          status: "active",
        },
        {
          id: "2",
          name: "Ventas",
          lastMessage: "Los precios actualizados están disponibles en nuestra web",
          time: "Hace 2 horas",
          unread: false,
          status: "active",
        },
        {
          id: "3",
          name: "Atención al Cliente",
          lastMessage: "Su caso ha sido escalado a nuestro departamento especializado",
          time: "Ayer",
          unread: false,
          status: "pending",
        },
      ])
    }, 500)
  })
}

