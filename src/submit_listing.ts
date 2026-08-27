export {};

const response = await fetch("http://localhost:3000/listings/cutout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    courseId: "course-photo-101",
    learnerId: "learner-42",
    image: "https://example.edu/submissions/backpack.jpg",
    listingDeadline: "2026-09-01T16:00:00+08:00",
    submittedAt: "2026-09-01T15:30:00+08:00",
    format: "png"
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
if (!response.ok) process.exitCode = 1;
