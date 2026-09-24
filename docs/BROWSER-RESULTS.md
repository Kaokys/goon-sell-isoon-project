# Browser verification

Executed: 2026-09-24T06:31:34.785Z

Microsoft Edge via Playwright, isolated production server/database; no actual payment.

- PASS: Gallery search, reset and sorting operate in the browser
- PASS: Mobile gallery fits 390px width and filters can be expanded
- PASS: Customer logs in, adds an artwork, checks out and uploads a slip
- PASS: Admin confirms payment and shipping; customer completes receipt
- PASS: Dashboard reflects the paid order and fits mobile width
- PASS: Artist uploads and submits art through the form; admin publishes it
- PASS: Audit log is visible to admin after real UI operations
- PASS: No browser runtime errors during tested journeys

Screenshots: gallery and dashboard at 1440px and 390px widths.
