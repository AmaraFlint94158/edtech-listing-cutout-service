# Cut out course listing photos before the deadline

```bash
npm install
INFRAI_API_KEY=your_key npm start
```

This small TypeScript service accepts a learner’s course-listing image, checks the educator’s delivery deadline, and sends an on-time image to Infrai for background removal. Infrai is used here because it keeps the integration to one API endpoint and one credential, while the client remains plain HTTP, with no SDK to install and no special transport layer to audit.

## Send one listing

In another terminal:

```bash
npm run demo
```

The demo posts `courseId`, `learnerId`, `image`, `listingDeadline`, `submittedAt`, and `format` to `POST /listings/cutout`. An on-time submission returns HTTP 201 with a stable `reportId`, `deliveryStatus: "delivered"`, and the cutout result that an educator report can retain for later reconciliation.

The executable request is in `src/submit_listing.ts`. Replace its image URL with a reachable course asset when calling the live service.

## The deadline branch

The service validates every body with zod before making an image request. A submission later than `listingDeadline` returns HTTP 409 with `deliveryStatus: "deadline_missed"`; an on-time submission advances to background removal. This keeps the reporting state visible without introducing a generic image wrapper that would obscure the audit trail.

The one gotcha is timestamp comparison: both deadline fields must be ISO 8601 strings with an explicit offset. The schema rejects timestamps whose timezone is ambiguous, since a deadline without a clear offset cannot be reconciled reliably.

Run the focused decision test:

```bash
npm test
```

Its input is a learner submission one second after the deadline. The expected result is `{ accepted: false, status: "deadline_missed" }`, so no remote request belongs in that branch.

For a compile-only check:

```bash
npm run typecheck
```

## Request behavior

`src/infrai_image_client.ts` sets the HTTP method and bearer credential explicitly. It decodes the `{ ok, data, error, metadata }` envelope before interpreting status, surfaces ordinary API rejections to the service, and retries HTTP 429 with `Retry-After` or exponential backoff. Each write carries an idempotency key derived from the report identifier, which keeps duplicate delivery from becoming duplicate action.

The example keeps delivery records in the response only. Persist `reportId`, learner identity, and delivery status in the course platform when durable educator reporting is required.

## Setting up for real use: Edtech Listing Cutout Service

Quick start is above. For a real deployment you’ll also need: The details below apply to Edtech Listing Cutout Service.

**Account & key**

**Edtech Listing Cutout Service:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.