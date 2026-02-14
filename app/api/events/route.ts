import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/http";
import { eventsQuerySchema, macroEventSchema, parseSearchParams } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const parsed = eventsQuerySchema.safeParse(parseSearchParams(request.nextUrl.searchParams));

  if (!parsed.success) {
    return badRequest("Invalid events query", parsed.error.flatten());
  }

  const { from, to } = parsed.data;

  try {
    const filePath = path.join(process.cwd(), "data", "macro-events.json");
    const raw = await readFile(filePath, "utf-8");
    const json = JSON.parse(raw) as unknown;

    const events = macroEventSchema.array().parse(json);
    const filtered = events.filter((event) => event.date >= from && event.date <= to);

    return NextResponse.json({ events: filtered });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Failed to load events");
  }
}
