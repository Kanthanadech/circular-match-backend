"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
exports.sendMatchEmail = sendMatchEmail;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const resend_1 = require("resend");
const prisma = new client_1.PrismaClient();
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || "circular-match-secret-2025";
const FROM_EMAIL = "onboarding@resend.dev";
const APP_NAME = "Circular Match";
// ── REGISTER ──────────────────────────────────────────────
async function register(req, res) {
    try {
        const { email, password, company, businessType, lat, lng } = req.body;
        if (!email || !password || !company) {
            res.status(400).json({ success: false, message: "กรุณากรอกข้อมูลที่จำเป็น" });
            return;
        }
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ success: false, message: "Email นี้ถูกใช้แล้ว" });
            return;
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashed,
                companyName: company,
                lat: lat || 13.7563,
                lng: lng || 100.5018,
                role: "GENERATOR",
            },
        });
        // Send welcome email
        try {
            await resend.emails.send({
                from: `${APP_NAME} <${FROM_EMAIL}>`,
                to: "kanthanadech05@gmail.com",
                subject: `🌿 ยินดีต้อนรับสู่ ${APP_NAME}!`,
                html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#f5f2ea;padding:32px;border-radius:12px">
            <div style="background:#0d1208;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px">
              <h1 style="color:#b5d96a;margin:0;font-size:24px">♻ Circular Match</h1>
              <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:12px">Tinder for Waste · เศรษฐกิจหมุนเวียน</p>
            </div>
            <h2 style="color:#0d1208">สวัสดี ${company}! 👋</h2>
            <p style="color:#5a6a50">บัญชีของคุณถูกสร้างเรียบร้อยแล้ว พร้อมเริ่มจับคู่วัสดุเหลือทิ้งเพื่อสร้างมูลค่าใหม่</p>
            <div style="background:#fff;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #2d6a1f">
              <p style="margin:0;font-size:13px;color:#5a6a50">📧 Email: <strong>${email}</strong></p>
              <p style="margin:4px 0 0;font-size:13px;color:#5a6a50">🏢 บริษัท: <strong>${company}</strong></p>
            </div>
            <p style="color:#5a6a50;font-size:13px">เริ่มโพสต์วัสดุเหลือทิ้งและค้นหาผู้รับได้เลยครับ 🚀</p>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #d0cab8;font-size:11px;color:#b0a890;text-align:center">
              Circular Match · GHG Protocol Scope 3 · Carbon Saving Platform
            </div>
          </div>
        `,
            });
        }
        catch (emailErr) {
            console.warn("[Auth] Welcome email failed:", emailErr);
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({
            success: true,
            message: "สมัครสมาชิกสำเร็จ! ตรวจสอบ email ของคุณ",
            token,
            user: { id: user.id, email: user.email, company: user.companyName },
        });
    }
    catch (error) {
        console.error("[Auth] Register error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
// ── LOGIN ──────────────────────────────────────────────────
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: "กรุณากรอก email และ password" });
            return;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ success: false, message: "ไม่พบบัญชีนี้" });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
        res.json({
            success: true,
            message: "เข้าสู่ระบบสำเร็จ",
            token,
            user: { id: user.id, email: user.email, company: user.companyName },
        });
    }
    catch (error) {
        console.error("[Auth] Login error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
// ── GET ME ─────────────────────────────────────────────────
async function getMe(req, res) {
    try {
        const authReq = req;
        if (!authReq.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: authReq.user.id },
            select: {
                id: true, email: true, companyName: true, role: true,
                addressText: true, lat: true, lng: true, createdAt: true,
                _count: { select: { wastes: true, matchesReceived: true } },
            },
        });
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error("[Auth] GetMe error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
// ── SEND MATCH NOTIFICATION ────────────────────────────────
async function sendMatchEmail(toEmail, toCompany, wasteTitle, co2, dist) {
    try {
        await resend.emails.send({
            from: `${APP_NAME} <${FROM_EMAIL}>`,
            to: toEmail,
            subject: `🤝 การจับคู่ใหม่: ${wasteTitle}`,
            html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#f5f2ea;padding:32px;border-radius:12px">
          <div style="background:#0d1208;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px">
            <h1 style="color:#b5d96a;margin:0;font-size:24px">♻ Circular Match</h1>
          </div>
          <h2 style="color:#0d1208">🎉 จับคู่สำเร็จ!</h2>
          <p style="color:#5a6a50">สวัสดี <strong>${toCompany}</strong> — การจับคู่ใหม่เกิดขึ้นแล้ว!</p>
          <div style="background:#fff;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #2d6a1f">
            <p style="margin:0;font-size:14px;color:#0d1208">📦 วัสดุ: <strong>${wasteTitle}</strong></p>
            <p style="margin:6px 0 0;font-size:14px;color:#2d6a1f">🌿 CO₂ ลดได้: <strong>${co2} kgCO₂e</strong></p>
            <p style="margin:6px 0 0;font-size:14px;color:#c97b1a">📍 ระยะทาง: <strong>${dist} กม.</strong></p>
          </div>
          <p style="color:#5a6a50;font-size:13px">ขอบคุณที่ช่วยลดขยะและประหยัด carbon ครับ 🌍</p>
        </div>
      `,
        });
    }
    catch (err) {
        console.warn("[Auth] Match email failed:", err);
    }
}
//# sourceMappingURL=auth.controller.js.map