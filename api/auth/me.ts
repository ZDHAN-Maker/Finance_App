import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "MethodNotAllowed" });
    return;
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { appUser } = ctx;
  res.status(200).json({
    data: {
      id: appUser.id,
      name: appUser.name,
      telegram_connected: appUser.telegram_id !== null,
    },
  });
}
