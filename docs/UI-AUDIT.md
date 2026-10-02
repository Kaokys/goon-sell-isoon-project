# UI audit and repairs — 2 October 2026

Scope: existing SILLAPA storefront, customer account, artist Studio, Admin Portal, and the Admin-accessible Studio routes. Captured in the Codex in-app Browser using an isolated local database and demo accounts. No real payment or production data changes.

## Fixes

1. Storefront Orders link now remains available before and after login on every storefront page. Guests see a login call to action instead of an API error.
2. Session/cart state lives in the persistent root provider. Stale session responses cannot overwrite a newer login/logout. Navigation no longer recreates the account state.
3. Mobile/tablet menu supports login, registration, profile, saved addresses, logout and role portals. Menu closes on navigation/query change and Escape; expanded state is announced.
4. Admin order details retain the same sidebar/navigation as the rest of Admin. Breadcrumb and order links return to the correct portal.
5. Studio/Admin menus show all core links on mobile/tablet, including Orders, without hiding them beyond horizontal scrolling. Admin exposes a profile link; Studio exposes personal orders and profile.
6. Admin payment confirmation remains visible and disabled until a slip exists, with a reason. Personal order views and management actions are separated. Receipt confirmation is shown only for the customer or management.
7. Long names, order titles, form columns, QR panels and action rows fit narrow screens. Data tables keep readable columns and provide horizontal scrolling with a keyboard-focusable region and mobile hint.
8. Credits display loading/error states instead of appearing silently blank while the attribution file loads.

## Steps and results

| Step | Flow | Result |
| --- | --- | --- |
| 1 | Guest navigation, Orders login gate, tablet/mobile account menu | Pass |
| 2 | Customer gallery/categories, artists, artwork, cart, addresses, account/public profile, orders/detail, credits | Pass: 13 role/page combinations at 1440, 768 and 390px |
| 3 | Artist storefront/profile/public profile, artist page, Studio dashboard/artworks/orders | Pass: 7 combinations at all three widths |
| 4 | Admin storefront/profile/public profile, dashboard/artworks/orders/detail/users/categories/logs, and all six Studio routes | Pass: 16 combinations at all three widths |
| 5 | Artist artwork upload dialog, Admin user/category dialogs, checkout with an item and address dialog | Pass: forms fit mobile |
| 6 | Demo payment confirmation followed by shipping update | Pass: correct controls and status transitions |
| 7 | Extra 320px checkout and Admin order detail checks | Pass: no document horizontal overflow |

The recorded sweep has 108 viewport checks across 36 role/page combinations. Metrics contain no document overflow, visible error messages, loaded broken images, or missing Orders links in the inspected navigation. See [raw metrics](ui-audit/metrics.json).

Screenshots from this run: [Customer](ui-audit/customer-overview-390.png), [Artist](ui-audit/artist-overview-390.png), [Admin](ui-audit/admin-overview-390.png), [tablet account menu](ui-audit/04-after-tablet-menu.png), [order review](ui-audit/admin-order-review.png). Individual desktop/tablet/mobile captures and form captures are in `ui-audit/`.

Checks: TypeScript, production build, and 17 integration test groups. In-app Browser functional/visual checks described above; the standalone Playwright regression script was extended with navigation/menu assertions.

Limits: this checks the listed screens and exercised flows, not every possible user dataset, every interaction combination, full screen-reader/contrast compliance, or external Google OAuth configuration. Wide data tables intentionally scroll within their region. Asset provenance is outside this UI repair pass.