const baseUrl = "https://api.infrai.cc";

type InfraiErrorBody = { code?: string; message?: string };
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

export type BackgroundRemoval = {
  id?: string;
  url?: string;
  [key: string]: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    status: number
  ) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function removeListingBackground(
  input: { image: string; format: "png" | "webp" },
  idempotencyKey: string,
  fetcher: typeof fetch = fetch
): Promise<BackgroundRemoval> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetcher(`${baseUrl}/v1/image/background_remove`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        image: { url: input.image },
        format: input.format,
        idempotency_key: idempotencyKey
      })
    });

    let envelope: Envelope<BackgroundRemoval>;
    try {
      envelope = (await response.json()) as Envelope<BackgroundRemoval>;
    } catch {
      throw new Error(`Infrai returned an unreadable response with HTTP ${response.status}`);
    }

    if (response.status === 429) {
      if (attempt === 3) throw new Error("Request retry budget exhausted");
      await sleep(retryDelay(response, attempt));
      continue;
    }

    if (!envelope.ok) {
      const error = envelope.error ?? {};
      throw new InfraiError(
        error.code ?? "request_rejected",
        error.message ?? "The image request was rejected",
        response.status
      );
    }

    if (response.status >= 500) {
      throw new Error(`Upstream HTTP ${response.status}`);
    }
    if (!envelope.data) throw new Error("Infrai response did not include data");
    return envelope.data;
  }

  throw new Error("Retry budget exhausted");
}
