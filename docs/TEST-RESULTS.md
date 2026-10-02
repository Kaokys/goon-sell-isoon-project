# Integration test results

Executed: 2026-10-02T17:01:41.927Z

Production Next.js server with isolated local test data. No live payment sent.

- PASS: Registration ignores injected role; new users are customers
- PASS: Server-side role checks protect users, reports and audit logs
- PASS: Cross-origin writes rejected
- PASS: Invalid login and registration validation
- PASS: One default art category and backward-compatible old category links
- PASS: Pending art is private; artists cannot edit another artist’s work
- PASS: Uploads validate actual image bytes, size/type and uploader role; drafts stay private
- PASS: Homepage poster: admin upload/save/reset, public published image, role protection and audit log
- PASS: Artwork/category CRUD, validation, review and draft-to-public transitions
- PASS: Search, category/price filters, price sort and non-overlapping pagination
- PASS: Saved addresses: Thai geography validation, ownership, one default, deletion fallback and immutable order snapshot
- PASS: Checkout stores bank payment and buyer note; server controls shipping/total and rejects unsupported payment
- PASS: Checkout computes price on server; idempotency, reservation and private orders enforced
- PASS: Private slips, rejection/re-upload, admin-only payment confirmation and shipping workflow
- PASS: Concurrent purchases have exactly one winner; cancellation releases inventory
- PASS: Dashboard totals and transactional audit trail match completed operations
- PASS: Profile requests, role promotion, session invalidation, deactivation and self-lockout prevention
- PASS: Artwork soft deletion and unused category deletion
- PASS: Logout invalidates server-side session

19 groups passed. Live Vercel Blob connectivity is not covered without the project store token.
