import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export type ApiErrorShape = {
  code: string;
  message: string;
  details?: unknown;
};

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ code, message, ...(details !== undefined ? { details } : {}) }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function parseAndValidate<T>(req: Request, schema: ZodSchema<T>) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false as const, error: apiError("INVALID_JSON", "Corpo da requisicao invalido.", 400) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: apiError("VALIDATION_ERROR", "Dados invalidos.", 422, parsed.error.flatten())
    };
  }

  return { ok: true as const, data: parsed.data };
}

