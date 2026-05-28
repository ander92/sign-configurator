import { Router } from 'express';
import { generateImage } from '../controllers/openaiController';

const router = Router();

router.post('/generate', generateImage);

export default router;
