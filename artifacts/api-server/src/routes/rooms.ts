import { Router, type IRouter } from "express";
import {
  CreateRoomResponse,
  GetRoomParams,
  GetRoomResponse,
} from "@workspace/api-zod";
import { createRoom, getRoom, getRoomSnapshot } from "../lib/rooms";

const router: IRouter = Router();

router.post("/rooms", (_req, res) => {
  const room = createRoom();
  const data = CreateRoomResponse.parse(getRoomSnapshot(room));
  res.status(201).json(data);
});

router.get("/rooms/:code", (req, res) => {
  const params = GetRoomParams.parse(req.params);
  const room = getRoom(params.code);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const data = GetRoomResponse.parse(getRoomSnapshot(room));
  res.json(data);
});

export default router;
