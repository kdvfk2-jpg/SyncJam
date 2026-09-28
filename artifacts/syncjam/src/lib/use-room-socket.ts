import { useEffect, useRef, useState } from 'react';

export type Participant = {
  id: string;
  name: string;
  isHost: boolean;
  isSelf: boolean;
  status: string;
  clockOffsetMs: number;
};

export type PlaybackState = {
  action: 'play' | 'pause' | 'seek';
  state: 'playing' | 'paused';
  positionSeconds: number;
  serverTime: number;
};

export type RoomSocketState = {
  participants: Participant[];
  currentVideoId: string | null;
  currentPlayback: PlaybackState | null;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline';
  lastMessageAt: number | null;
};

const emptyState: RoomSocketState = {
  participants: [],
  currentVideoId: null,
  currentPlayback: null,
  status: 'connecting',
  lastMessageAt: null,
};

function socketUrl(code: string, nodeId: string, name: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({
    room: code,
    nodeId,
    name,
  });
  return `${protocol}//${window.location.host}/api/ws?${params.toString()}`;
}

function getNodeId() {
  const key = 'syncjam-node-id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `node-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function getNodeName() {
  const key = 'syncjam-node-name';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const userAgent = window.navigator.userAgent;
  const generated = /iPhone|iPad|iPod/i.test(userAgent)
    ? 'iPhone'
    : /Android/i.test(userAgent)
      ? 'Android'
      : 'Browser';
  window.localStorage.setItem(key, generated);
  return generated;
}

function normalizeParticipant(value: Partial<Participant>, index: number, selfId: string): Participant {
  return {
    id: String(value.id ?? `device-${index}`),
    name: String(value.name ?? `Device ${index + 1}`),
    isHost: Boolean(value.isHost),
    isSelf: String(value.id ?? '') === selfId,
    status: String(value.status ?? 'ready'),
    clockOffsetMs: Number(value.clockOffsetMs ?? 0),
  };
}

function extractRoomUpdate(
  message: unknown,
  selfId: string,
): {
  participants: Participant[];
  currentVideoId: string | null;
  currentPlayback: PlaybackState | null;
} | null {
  if (!message || typeof message !== 'object') return null;
  const payload = message as {
    participants?: unknown;
    room?: {
      participants?: unknown;
      currentVideoId?: unknown;
      currentPlayback?: unknown;
    };
    data?: { participants?: unknown };
    type?: string;
  };
  const raw = payload.participants ?? payload.room?.participants ?? payload.data?.participants;
  if (!Array.isArray(raw)) return null;
  const currentVideoId =
    typeof payload.room?.currentVideoId === 'string' ? payload.room.currentVideoId : null;
  const rawPlayback = payload.room?.currentPlayback;
  const currentPlayback =
    rawPlayback &&
    typeof rawPlayback === 'object' &&
    (rawPlayback as { action?: unknown }).action &&
    (rawPlayback as { state?: unknown }).state &&
    typeof (rawPlayback as { positionSeconds?: unknown }).positionSeconds === 'number' &&
    typeof (rawPlayback as { serverTime?: unknown }).serverTime === 'number'
      ? (rawPlayback as PlaybackState)
      : null;
  return {
    participants: raw.map((participant, index) =>
      normalizeParticipant((participant ?? {}) as Partial<Participant>, index, selfId),
    ),
    currentVideoId,
    currentPlayback,
  };
}

export function useRoomSocket(code: string) {
  const [state, setState] = useState<RoomSocketState>(emptyState);
  const retryRef = useRef<number | undefined>(undefined);
  const socketRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    const nodeId = getNodeId();
    const nodeName = getNodeName();
    setState({ ...emptyState });

    if (!code) {
      setState({ ...emptyState, status: 'offline' });
      return () => {
        disposed = true;
      };
    }

    const connect = () => {
      if (disposed) return;
      setState((current) => ({
        ...current,
        status: attemptRef.current > 0 ? 'reconnecting' : 'connecting',
      }));

      if (typeof WebSocket === 'undefined') {
        setState((current) => ({ ...current, status: 'offline' }));
        return;
      }

      const socket = new WebSocket(socketUrl(code, nodeId, nodeName));
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        setState((current) => ({ ...current, status: 'connected' }));
      };

      socket.onmessage = (event) => {
        try {
          const update = extractRoomUpdate(JSON.parse(event.data as string), nodeId);
          if (update) {
            setState((current) => ({
              ...current,
              participants: update.participants,
              currentVideoId: update.currentVideoId,
              currentPlayback: update.currentPlayback,
              lastMessageAt: Date.now(),
            }));
          }
        } catch {
          // Ignore malformed presence frames; the next heartbeat or snapshot can recover.
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        if (disposed) return;
        socketRef.current = null;
        attemptRef.current += 1;
        setState((current) => ({ ...current, status: 'reconnecting' }));
        const delay = Math.min(1000 * 2 ** Math.min(attemptRef.current - 1, 4), 10000);
        retryRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryRef.current) window.clearTimeout(retryRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [code]);

  const setCurrentVideo = (videoId: string) => {
    socketRef.current?.send(JSON.stringify({ type: 'video:set', videoId }));
  };

  const setCurrentPlayback = (
    playback: Pick<PlaybackState, 'action' | 'state' | 'positionSeconds'>,
  ) => {
    socketRef.current?.send(JSON.stringify({ type: 'playback:set', ...playback }));
  };

  return { ...state, setCurrentVideo, setCurrentPlayback };
}