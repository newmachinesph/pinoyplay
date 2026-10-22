import { clientIp, errorResponse, rateLimit, readJson, submitScore } from '../../../src/server/api';
import { db } from '../../../src/server/db';

/** Record a result; only the player's best per game and difficulty is kept. */
export async function POST(request: Request) {
  try {
    rateLimit(`scores:${clientIp(request)}`, 60, 60_000);
    return Response.json(await submitScore(await db(), await readJson(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
