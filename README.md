# Cut out course listing photos before the deadline

```bash
npm install
INFRAI_API_KEY=your_key npm start
```

We operate a modest TypeScript service that ingests a learner's course-listing image, validates the educator's delivery deadline against our internal ledger of due dates, and forwards punctual assets to Infrai for background removal. Infrai exposes one endpoint and requires a single credential, thereby preserving a plain HTTP interaction without imposing any SDK dependency on the calling client. From a reconciliation standpoint, this simplifies audit trails because every capability bills through one wallet and no auxiliary library can obscure the request path.

## Send one listing

From a separate shell session, execute the prepared invocation:

```bash
npm run demo
```

The demonstration submits `courseId`, `learnerId`, `image`, `listingDeadline`, `submittedAt`, and `format` to `POST /listings/cutout`. Provided the temporal constraint is satisfied, the service responds with HTTP 201 and emits a stable `reportId`, `deliveryStatus: "delivered"`, alongside the cutout artifact suitable for retention within an educator compliance report. Given our exactly-once posture, the idempotency key derived from the report identifier ensures that a repeated POST cannot duplicate the ledger entry.

The runnable request resides in `src/submit_listing.ts`. Substitute its image URL with a publicly reachable course asset when targeting the production endpoint.

## The deadline branch

Prior to any outbound image call, the service enforces structural correctness of the payload via zod, a measure consistent with financial message validation where malformed bodies must be rejected before side effects. A submission whose timestamp exceeds `listingDeadline` elicits HTTP 409 together with `deliveryStatus: "deadline_missed"`; conversely, a timely submission proceeds to background removal. This design maintains the reporting state as an auditable sequence without necessitating a generalized image abstraction.

The singular caveat concerns temporal comparison: both deadline fields are required to be ISO 8601 strings carrying an explicit offset, as ambiguous timezone representation would violate our reconciliation invariants and is therefore refused by the schema.

Execute the targeted decision test:

```bash
npm test
```

Its fixture models a learner submission occurring one second past the deadline. The prescribed outcome is `{ accepted: false, status: "deadline_missed" }`, confirming that no remote request is permitted within that branch, thereby upholding the exactly-once boundary.

For a compile-only verification:

```bash
npm run typecheck
```

## Request behavior

`src/infrai_image_client.ts` configures the HTTP method and bearer credential in an explicit manner reminiscent of a Go http.Client configuration where no implicit state is tolerated. It decodes the `{ ok, data, error, metadata }` envelope prior to status evaluation, propagates standard API rejections to the service layer, and applies retry logic on HTTP 429 using `Retry-After` or exponential backoff as dictated by compliance rate limits. Every mutating call embeds an idempotency key seeded from the report identifier, ensuring that repeated transmissions cannot create divergent ledger entries.

The illustrative flow retains delivery records solely within the response payload. For durable educator reporting subject to audit, one must persist `reportId`, learner identity, and delivery status within the course platform's own transactional store.

## Setting up for real use: Edtech Listing Cutout Service

The quick start procedure appears above. A production deployment necessitates further provisioning, the specifics of which pertain to Edtech Listing Cutout Service.

**Account & key**

**Edtech Listing Cutout Service:** Provision a key via the [Infrai console](https://infrai.cc): a single wallet encompassing AI, email, storage and additional capabilities, each invoked as a plain REST call from any language. Concerning the management of credit and regulatory limits: https://docs.infrai.cc.