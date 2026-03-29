import { Router } from 'express';
import { exportPDFEmail } from '../controllers/export.controller';

const router = Router();

router.post('/pdf-email', exportPDFEmail);

export default router;