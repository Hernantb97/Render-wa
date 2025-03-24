// Type for user session
export interface UserSession {
  user: {
    id: string
    name: string
    email: string
  }
}

// Simulated function to get user session
export async function getServerSession(): Promise<UserSession | null> {
  // Simulate an authenticated user for demonstration purposes
  return {
    user: {
      id: "user-123",
      name: "Demo User",
      email: "demo@example.com",
    },
  }
}

