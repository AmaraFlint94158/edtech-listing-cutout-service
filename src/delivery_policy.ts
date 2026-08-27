import { z } from "zod";

export const listingRequestSchema = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  image: z.string().min(1),
  listingDeadline: z.string().datetime({ offset: true }),
  submittedAt: z.string().datetime({ offset: true }),
  format: z.enum(["png", "webp"]).default("png")
}).strict();

export type ListingRequest = z.infer<typeof listingRequestSchema>;

export type DeliveryDecision =
  | { accepted: true; status: "ready_for_cutout" }
  | { accepted: false; status: "deadline_missed" };

export function decideDelivery(input: ListingRequest): DeliveryDecision {
  if (Date.parse(input.submittedAt) > Date.parse(input.listingDeadline)) {
    return { accepted: false, status: "deadline_missed" };
  }
  return { accepted: true, status: "ready_for_cutout" };
}
