import { NextResponse } from "next/server";
import { getNetworkSnapshot } from "@/lib/network";
import { resolveCoinId } from "@/lib/coins";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(_: Request, context: { params: Promise<{ coin: string }> }) {
  const { coin } = await context.params;
  const id = resolveCoinId(coin);

  if (!id) {
    return NextResponse.json({ error: "Unknown chain" }, { status: 404 });
  }

  try {
    const snapshot = await getNetworkSnapshot(id);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Live network data is temporarily unavailable", coin: id },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
