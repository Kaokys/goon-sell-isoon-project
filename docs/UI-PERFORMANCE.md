# Storefront navigation and loading

The four main store links stay centered in the viewport at desktop widths, with the same spacing across storefront pages and account roles. Admin/artist portal links are in the account area; mobile menus retain portal links.

Public artwork lists, categories, artist lists and the homepage poster retain a short-lived in-memory preview while revalidating. Concurrent requests for the same public list share one request. Successful mutations invalidate the preview cache. Orders, sessions, private artwork details and management lists are excluded. Cached entries expire after 30 seconds and are limited to 50 paths.

Public artwork list and published image requests avoid unnecessary session-store lookups. Draft images and slips retain their permission checks. The hero image has high loading priority; thumbnail decoding is asynchronous. Interaction motion respects reduced-motion preferences.

Production build and 20 integration groups passed, including private media and role checks.

Browser checks passed for identical menu positions across 4 storefront pages, 4 roles and desktop widths 1440/1280. Mobile role portal links remain available. Cached art cards remain visible while the API response is held pending.

The utility bar and store header now stick to the viewport during scrolling and route changes. Global smooth scrolling is disabled to avoid animated route scroll restoration. Anchor targets account for the header height. Production browser checks passed at widths 1440, 900, 768 and 390 without page overflow.
