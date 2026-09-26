import { NextResponse } from "next/server";
import { getGpuLeaderboard } from "@/lib/gpus";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    const board = await getGpuLeaderboard();
    return NextResponse.json(board, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "GPU benchmark data is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
