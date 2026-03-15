import { apiError, apiOk } from "@/lib/api";
import { runMatchmaking } from "@/lib/matchmaking";

export async function POST(req: Request) {
  try {
    const result = await runMatchmaking();
    return apiOk(result);
  } catch (error) {
    return apiError("MATCHMAKING_FAILED", "Falha ao executar matchmaking.", 500, String((error as Error)?.message || error));
  }
}


