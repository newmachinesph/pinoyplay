import { clientIp, errorResponse, parseBoard, rateLimit, topScores } from '../../../src/server/api';
import { db } from '../../../src/server/db';

/** Top 10 for one game and difficulty: GET /api/leaderboard?game=jeepney-rush&difficulty=normal */
export async function GET(request: Request) {
  try {
    rateLimit(`board:${clientIp(request)}`, 120, 60_000);
    const { game, difficulty } = parseBoard(new URL(request.url).searchParams);
    return Response.json({ scores: await topScores(db(), game, difficulty) }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
