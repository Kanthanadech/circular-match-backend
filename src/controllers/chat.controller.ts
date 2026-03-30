// src/controllers/chat.controller.ts

import { Response } from "express";
import { prisma } from "../utils/prisma";
import { AuthenticatedRequest } from "../types";

// GET /api/chat/:matchId — ดึงข้อความทั้งหมด
export async function getMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const { matchId } = req.params;
    const userId = req.user!.id;

    // ตรวจสอบว่า user เป็นส่วนหนึ่งของ match นี้
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [
          { receiverId: userId },
          { waste: { generatorId: userId } },
        ],
      },
    });

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found or access denied" });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { matchId },
      include: {
        sender: {
          select: { id: true, companyName: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ success: true, data: messages });
  } catch (err) {
    console.error("[getMessages]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// POST /api/chat/:matchId — ส่งข้อความใหม่
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { matchId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    if (!content || content.trim() === "") {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    // ตรวจสอบว่า user เป็นส่วนหนึ่งของ match นี้
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [
          { receiverId: userId },
          { waste: { generatorId: userId } },
        ],
      },
    });

    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found or access denied" });
    }

    const message = await prisma.chatMessage.create({
      data: {
        matchId,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, companyName: true, role: true },
        },
      },
    });

    return res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error("[sendMessage]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
