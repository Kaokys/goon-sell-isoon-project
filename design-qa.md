# Design QA — role-first customer home and artist Studio

## Evidence

- Source visual truth: `C:\Users\ASUS Vivobook\.codex\generated_images\01a0d1e1-5a84-7c63-b188-d05e18438562\exec-a45572f7-09dc-4175-8dec-a731f52ef124.png`
- Source pixels: 1487 × 1058.
- Customer implementation: `D:\sillapa app isoon project\docs\screenshots\customer-home-mobile.png`
- Customer capture: 390 × 1687 pixels; compared at the 390 × 844 CSS viewport crop, deviceScaleFactor 1.
- Artist implementation: `D:\sillapa app isoon project\docs\screenshots\artist-studio-desktop.png`
- Artist capture: 1440 × 1345 pixels; compared at the 1440 × 1024 CSS viewport crop, deviceScaleFactor 1.
- Combined full-view comparison: `D:\sillapa app isoon project\docs\screenshots\design-qa-comparison.png`
- Additional responsive evidence: `D:\sillapa app isoon project\docs\screenshots\artist-studio-mobile.png`
- State: authenticated customer home and authenticated artist Studio dashboard, using isolated browser-test data.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: IBM Plex Sans Thai with Manrope fallback preserves the reference's bold Thai headings, compact labels, and readable 14–16px body scale. The heading hierarchy and weights match the selected direction.
- Spacing and layout rhythm: the customer view retains the search-first stack, three equal shortcuts, order card, recommendations, and persistent mobile navigation. The Studio retains a dark top bar, left navigation, three status summaries, a dominant upload action, next actions, revenue, and recent work.
- Colors and visual tokens: white and soft gray surfaces, #3151e8 cobalt actions, #111827 Studio chrome, and semantic amber, red, and green states align with the source.
- Image quality and asset fidelity: existing high-resolution artwork assets are used with intentional `object-fit: cover` crops. UI icons come from the project's Lucide icon set; no placeholder or CSS-drawn visual assets replace source imagery.
- Copy and content: Thai task labels are concise and tied to working routes. The implementation uses the real states `ต้องแก้ไข`, `รออนุมัติ`, and `เผยแพร่แล้ว` instead of inventing a draft state that the data model does not support.
- Accessibility and responsiveness: buttons and links retain visible focus states, mobile controls meet practical touch sizes, status is expressed with icon, color, and text, and both 390px captures have no horizontal overflow.

## Comparison history

### Iteration 1

- [P1] Artist Studio still inherited the storefront utility bar, storefront navigation, promotion strip, and footer. This blurred the boundary between shopping and artwork management and differed materially from the selected design.
- Fix: added a dedicated full-screen Studio shell with dark Studio top bar, direct storefront exit, artist identity, logout, persistent Studio navigation, and a neutral workspace background.
- Post-fix evidence: `docs/screenshots/artist-studio-desktop.png` and the lower-right frame in `docs/screenshots/design-qa-comparison.png` show the storefront chrome removed and the Studio hierarchy aligned with the source.

### Iteration 2

- No P0, P1, or P2 findings remained after comparing the updated customer and artist screens with the source in one combined image.

## Primary interactions tested

- Customer login, role-specific home, shortcuts, recommendation count, mobile bottom navigation, address selection, checkout, slip upload, order tracking, and receipt completion.
- Artist login, Studio dashboard, artwork upload, submission for approval, admin publication, and responsive 390px layout.
- Admin payment confirmation, shipping update, audit log, and role access controls.
- Browser console/page errors checked: none during the tested journeys.

## Follow-up polish

- [P3] The isolated customer screenshot shows the intentional empty-order state, while the source shows an active shipment. The same card automatically changes to the live order status and action when an order exists.
- [P3] Status totals and recent rows vary from the mock because they render real database values.

## Implementation checklist

- [x] Match the selected customer mobile hierarchy.
- [x] Match the selected artist Studio hierarchy.
- [x] Use live role and marketplace data.
- [x] Verify desktop and 390px mobile layouts.
- [x] Test the customer-to-admin-to-artist workflow.

final result: passed
