import { VercelRequest, VercelResponse } from '@vercel/node';
import { initServer } from '../server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await initServer();
  return app(req, res as any);
}
