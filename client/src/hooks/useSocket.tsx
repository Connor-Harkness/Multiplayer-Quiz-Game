import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Prefer same-origin by default to avoid mixed content/CORS issues.
    // Allow override via REACT_APP_SOCKET_URL for local development.
    // If running via CRA on port 3000, automatically point to the same host on port 5000.
    let socketUrl = process.env.REACT_APP_SOCKET_URL as string | undefined;
    if (!socketUrl && typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      if (port === '3000') {
        const targetPort = (process.env.REACT_APP_SOCKET_PORT as string) || '5000';
        socketUrl = `${protocol}//${hostname}:${targetPort}`;
      } else {
        socketUrl = undefined; // same-origin
      }
    }

    const newSocket = io(socketUrl, {
      // Allow both websocket and polling for wider compatibility on mobile/networks
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};