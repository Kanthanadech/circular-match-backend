"use strict";
// src/routes/chat.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.chatRouter = (0, express_1.Router)();
// ต้อง login ก่อนทุก route
exports.chatRouter.use(auth_middleware_1.authenticate);
// GET  /api/chat/:matchId — ดึงข้อความทั้งหมดในการจับคู่นั้น
exports.chatRouter.get("/:matchId", chat_controller_1.getMessages);
// POST /api/chat/:matchId — ส่งข้อความใหม่
exports.chatRouter.post("/:matchId", chat_controller_1.sendMessage);
//# sourceMappingURL=chat.routes.js.map