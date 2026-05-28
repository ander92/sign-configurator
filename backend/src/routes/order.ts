import { Router } from 'express';

const router = Router();

router.post('/', (req, res) => {
  const { name, email, message, config } = req.body;
  return res.status(201).json({
    status: 'created',
    order: {
      name,
      email,
      message,
      config,
      note: 'Order received. Continue building the order flow by saving the request to a database.'
    }
  });
});

export default router;
