import { ZodError } from "zod";

export class HttpError extends Error {
  readonly status: 400 | 404 | 409;

  constructor(status: 400 | 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Body must be valid JSON");
  }
}

export function requireParam(value: string | null, name: string): string {
  if (!value) throw new HttpError(400, `Missing query parameter ${name}`);
  return value;
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
  }
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Internal error" }, { status: 500 });
}
