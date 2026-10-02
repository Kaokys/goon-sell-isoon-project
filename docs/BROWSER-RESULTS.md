# Browser verification

Executed: 2026-10-02T11:10:33.404Z

Microsoft Edge via Playwright, isolated production server/database; no actual payment.

- PASS: Invalid registration fields show calm inline red text without an alert card
- PASS: Gallery search, reset and sorting operate in the browser
- PASS: Mobile gallery fits 390px width and filters can be expanded
- PASS: Customer retains login after reload and uses the same gallery home as guests
- PASS: Navigation categories filter results, retain selection after reload and show an honest empty state
- PASS: New non-default address stays selected; address picker works; default address persists after reload
- PASS: Checkout saves a structured Thai address, fills postcode, selects payment and fits mobile
- PASS: Customer logs in, adds an artwork, checks out and uploads a slip
- PASS: Customer accounts are blocked from the separate admin portal
- PASS: Admin confirms payment and shipping; customer completes receipt
- PASS: Dashboard reflects the paid order and fits mobile width
- PASS: Artist Studio highlights upload, approval states, next actions and fits mobile
- PASS: Artist uploads and submits art through the form; admin publishes it
- PASS: Audit log is visible in the separate admin portal
- PASS: customer: all 12 routes render without errors and fit mobile
- PASS: admin: all 10 routes render without errors and fit mobile
- PASS: artist: all 7 routes render without errors and fit mobile
- PASS: Profile customization saves and public profile displays saved content
- PASS: Customer, admin and artist logout persists after reload
- PASS: No browser runtime errors during tested journeys

Screenshots: gallery, customer home, artist Studio and admin dashboard at desktop and 390px mobile widths.
