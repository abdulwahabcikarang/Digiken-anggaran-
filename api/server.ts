import { VercelRequest, VercelResponse } from '@vercel/node';
import { initServer } from '../server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Tell express that the body is already parsed by Vercel
  if (req.body) {
    (req as any)._body = true;
  }
  const app = await initServer();
  return app(req, res as any);
}
