import { clientIp, errorResponse, rateLimit, readJson, registerPlayer } from '../../../src/server/api';
import { db } from '../../../src/server/db';

/** Register a device and review its display name. */
export async function POST(request: Request) {
  try {
    rateLimit(`players:${clientIp(request)}`, 20, 60_000);
    return Response.json(await registerPlayer(await db(), await readJson(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
