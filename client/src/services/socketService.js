import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socketInstance = null;

const getToken = () => localStorage.getItem('token') || '';

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_BASE_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: false,
      auth: {
        token: getToken(),
      },
    });
  }

  socketInstance.auth = {
    token: getToken(),
  };

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
};

export const closeSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
