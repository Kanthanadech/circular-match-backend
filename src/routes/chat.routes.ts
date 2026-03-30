// src/routes/chat.routes.ts

import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth.middleware";

export const chatRouter = Router();

// ต้อง login ก่อนทุก route
chatRouter.use(authenticate);

// GET  /api/chat/:matchId — ดึงข้อความทั้งหมดในการจับคู่นั้น
chatRouter.get("/:matchId", getMessages);

// POST /api/chat/:matchId — ส่งข้อความใหม่
chatRouter.post("/:matchId", sendMessage);
