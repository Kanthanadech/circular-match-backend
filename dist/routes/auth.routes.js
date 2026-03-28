"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
// src/routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", auth_controller_1.register);
exports.authRouter.post("/login", auth_controller_1.login);
exports.authRouter.get("/me", auth_middleware_1.authMiddleware, auth_controller_1.getMe);
//# sourceMappingURL=auth.routes.js.map