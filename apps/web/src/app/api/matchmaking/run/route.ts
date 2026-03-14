import { NextResponse } from "next/server";
import { runMatchmaking } from "@/lib/matchmaking";

export async function POST() {
  const result = await runMatchmaking();
  return NextResponse.json(result);
}

