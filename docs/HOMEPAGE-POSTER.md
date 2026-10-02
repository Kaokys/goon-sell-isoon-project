# Homepage poster management

Admins can open `/admin/poster`, upload JPG/PNG/WebP up to 3 MB, preview the existing homepage text over the image, then save or restore the default image. Uploaded drafts stay private until saved. Storefront visitors use the published image without login.

The `site_settings` table is included in the Vercel Blob JSON snapshot. Existing snapshots without this table use the original image. Saving records the previous and new image in the audit trail. Only admins may upload banner media or change the published poster.

Validation: production build, typecheck and 18 integration test groups passed, including poster publication, reset, admin role protection, draft visibility and audit logging.

Browser verification passed: admin upload, preview, save, storefront navigation/reload and reset; 1440, 768 and 390 pixel widths without page overflow.
