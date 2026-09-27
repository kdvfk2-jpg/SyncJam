import type { WebSocket } from "ws";

export type Participant = {
  id: string;
  name: string;
  isHost: boolean;
  status: "online";
  clockOffsetMs: number;
  socket: WebSocket;
};

export type Room = {
  code: string;
  createdAt: number;
  hostId: string | null;
  participants: Map<string, Participant>;
};

const rooms = new Map<string, Room>();
const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createCode() {
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += roomAlphabet[Math.floor(Math.random() * roomAlphabet.length)];
  }
  return code;
}

export function createRoom() {
  let code = createCode();
  while (rooms.has(code)) code = createCode();

  const room: Room = {
    code,
    createdAt: Date.now(),
    hostId: null,
    participants: new Map(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string) {
  return rooms.get(code);
}

export function getRoomSnapshot(room: Room) {
  return {
    code: room.code,
    createdAt: room.createdAt,
    participantCount: room.participants.size,
  };
}

export function getPresenceSnapshot(room: Room) {
  return {
    code: room.code,
    hostId: room.hostId,
    participants: Array.from(room.participants.values()).map(
      ({ socket: _socket, ...participant }) => participant,
    ),
  };
}

export function addParticipant(
  room: Room,
  participant: Omit<Participant, "isHost">,
) {
  const isHost = room.hostId === null;
  const nextParticipant = { ...participant, isHost };
  room.participants.set(participant.id, nextParticipant);
  if (isHost) room.hostId = participant.id;
  return nextParticipant;
}

export function removeParticipant(room: Room, participantId: string) {
  room.participants.delete(participantId);
  if (room.hostId === participantId) {
    room.hostId = room.participants.keys().next().value ?? null;
    const nextHostId = room.hostId;
    if (nextHostId) {
      const nextHost = room.participants.get(nextHostId);
      if (nextHost) room.participants.set(nextHostId, { ...nextHost, isHost: true });
    }
  }
  if (room.participants.size === 0) rooms.delete(room.code);
}

export function broadcast(room: Room, message: unknown) {
  const payload = JSON.stringify(message);
  for (const participant of room.participants.values()) {
    if (participant.socket.readyState === 1) participant.socket.send(payload);
  }
}
