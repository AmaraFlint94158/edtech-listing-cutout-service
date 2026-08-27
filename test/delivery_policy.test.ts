import assert from "node:assert/strict";
import test from "node:test";
import { decideDelivery, listingRequestSchema } from "../src/delivery_policy.js";

test("marks a learner submission after the listing deadline", () => {
  const input = listingRequestSchema.parse({
    courseId: "course-photo-101",
    learnerId: "learner-42",
    image: "https://example.edu/submissions/backpack.jpg",
    listingDeadline: "2026-09-01T16:00:00+08:00",
    submittedAt: "2026-09-01T16:00:01+08:00",
    format: "png"
  });

  assert.deepEqual(decideDelivery(input), {
    accepted: false,
    status: "deadline_missed"
  });
});
