import { NextRequest, NextResponse } from "next/server";
import { indexScopeSchema } from "@/lib/validation";
import { resolveUniverse } from "@/lib/universe";
import { badRequest, serverError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const rawIndex = request.nextUrl.searchParams.get("index") ?? "both";
  const parsedScope = indexScopeSchema.safeParse(rawIndex);

  if (!parsedScope.success) {
    return badRequest("Invalid index scope", parsedScope.error.flatten());
  }

  try {
    const universe = await resolveUniverse(parsedScope.data);

    return NextResponse.json({
      symbols: universe.symbols,
      asOf: new Date().toISOString().slice(0, 10),
      sources: universe.sources
    });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to load index constituents"
    );
  }
}
