// Socket.io utilities for real-time updates
import { io, Socket } from "socket.io-client";
import { useEffect } from "react";

let socket: Socket | null = null;
let listeners: Record<string, Set<Function>> = {};

const socketUrl = () =>
  process.env.REACT_APP_WS_URL?.replace(/^http/, "ws") ||
  process.env.REACT_APP_API_URL?.replace(/^http/, "ws") ||
  "ws://localhost:8080";

const ensureSocket = () => {
  if (!socket) {
    const url = socketUrl();
    socket = io(url, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      autoConnect: true,
    });

    const logEvent = (eventName: string, payload: any) => {
      const interesting = [
        "socket:connected",
        "socket:disconnected",
        "socket:reconnect_attempt",
        "socket:reconnect_failed",
        "socket:error",
        "officer.location.update",
        "incident.updated",
        "sos.triggered",
        "dispatch.status_changed",
      ];
      if (interesting.includes(eventName)) {
        console.debug("[socket]", eventName, payload);
      }
    };

    socket.on("connect", () => {
      console.log("Socket connected:", socket?.id);
      logEvent("socket:connected", { socketId: socket?.id });
      emit("socket:connected", { socketId: socket?.id });
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      logEvent("socket:disconnected", { reason });
      emit("socket:disconnected", { reason });
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log("Socket reconnect attempt:", attempt);
      logEvent("socket:reconnect_attempt", { attempt });
      emit("socket:reconnect_attempt", { attempt });
    });

    socket.on("reconnect", (attempt) => {
      console.log("Socket reconnected:", attempt);
      logEvent("socket:reconnected", { attempt });
      emit("socket:reconnected", { attempt });
    });

    socket.on("reconnect_failed", () => {
      console.warn("Socket reconnect failed");
      logEvent("socket:reconnect_failed", {});
      emit("socket:reconnect_failed", {});
      setTimeout(() => {
        if (socket && !socket.connected) {
          console.log("Retrying socket connection after failure...");
          socket.connect();
        }
      }, 5000);
    });

    socket.on("connect_error", (error) => {
      console.warn("Socket connect error:", error);
      logEvent("socket:error", error);
      emit("socket:error", error);
    });

    const bindEvent = (name: string, internalName?: string) => {
      socket?.on(name, (data) => {
        const eventName = internalName || name;
        logEvent(eventName, data);
        emit(eventName, data);
      });
    };

    bindEvent("incident:new", "incident.new");
    bindEvent("incident:updated", "incident.updated");
    bindEvent("incident.updated", "incident.updated");
    bindEvent("incident:verified", "incident.verified");
    bindEvent("incident:resolved", "incident.resolved");
    bindEvent("incident:deleted", "incident.deleted");
    bindEvent("incident:restored", "incident.restored");

    bindEvent("officer:status_changed", "officer.status_changed");
    bindEvent("officer.location_updated", "officer.location_updated");
    bindEvent("officer.location.update", "officer.location.update");

    bindEvent("dispatch:assigned", "dispatch.assigned");
    bindEvent("dispatch:status_changed", "dispatch.status_changed");

    bindEvent("sos:triggered", "sos.triggered");
    bindEvent("sos.triggered", "sos.triggered");

    bindEvent("notification");
    bindEvent("alert");
  }
  return socket;
};

const emit = (event: string, data: any) => {
  if (listeners[event]) {
    listeners[event].forEach((callback) => callback(data));
  }
};

export const socketEvents = {
  on: (event: string, callback: (data: any) => void) => {
    ensureSocket();
    if (!listeners[event]) {
      listeners[event] = new Set();
    }
    listeners[event].add(callback);

    return () => {
      listeners[event].delete(callback);
    };
  },

  emit: (event: string, data: any) => {
    const socketInstance = ensureSocket();
    if (socketInstance) {
      socketInstance.emit(event, data);
    }
  },

  connect: () => {
    ensureSocket();
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  isConnected: () => socket?.connected ?? false,
};

export const useSocketEvent = (event: string, callback: (data: any) => void, deps: any[] = []) => {
  useEffect(() => {
    const unsubscribe = socketEvents.on(event, callback);
    return unsubscribe;
  }, [event, callback, ...deps]);
};
