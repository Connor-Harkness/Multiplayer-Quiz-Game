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
    // Determine the server URL based on the current environment
    const getServerUrl = () => {
      // In production, use the same protocol and host as the client
      if (process.env.NODE_ENV === 'production') {
        return `${window.location.protocol}//${window.location.hostname}:5000`;
      }
      
      // In development, check if we have a custom backend URL
      if (process.env.REACT_APP_SERVER_URL) {
        return process.env.REACT_APP_SERVER_URL;
      }
      
      // Default to localhost for development
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    };

    const serverUrl = getServerUrl();
    console.log('Connecting to server at:', serverUrl);
    
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'] // Allow fallback to polling for better compatibility
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