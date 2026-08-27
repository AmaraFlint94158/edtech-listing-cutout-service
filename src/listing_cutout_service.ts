import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { decideDelivery, listingRequestSchema } from "./delivery_policy.js";
import { InfraiError, removeListingBackground } from "./infrai_image_client.js";

function send(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/listings/cutout") {
    send(response, 404, { error: "route_not_found" });
    return;
  }

  try {
    const input = listingRequestSchema.parse(await readJson(request));
    const decision = decideDelivery(input);
    if (!decision.accepted) {
      send(response, 409, {
        courseId: input.courseId,
        learnerId: input.learnerId,
        deliveryStatus: decision.status
      });
      return;
    }

    const reportId = randomUUID();
    const cutout = await removeListingBackground(
      { image: input.image, format: input.format },
      reportId
    );
    send(response, 201, {
      reportId,
      courseId: input.courseId,
      learnerId: input.learnerId,
      deliveryStatus: "delivered",
      cutout
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "invalid_request" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.code, message: error.message });
      return;
    }
    send(response, 502, { error: "image_processing_failed" });
  }
});

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`listing cutout service listening on :${port}`));
}
