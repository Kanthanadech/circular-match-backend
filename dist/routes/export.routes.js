"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_controller_1 = require("../controllers/export.controller");
const router = (0, express_1.Router)();
router.post('/pdf-email', export_controller_1.exportPDFEmail);
exports.default = router;
//# sourceMappingURL=export.routes.js.map