# Shopbook implementation status

Updated: 28 September 2026.

## Project goal

Give one shop owner a single dashboard for daily billing, stock, staff, customers, collections, and Udhar. Every sale, payment, stock adjustment, and cancellation must leave a traceable history. Customer debt is calculated from ledger transactions.

## Delivered

| Module | Implemented behavior |
| --- | --- |
| Shop | First-owner setup, profile, logo, address, phone, GSTIN, hours, invoice prefix/sequence, payment methods |
| Staff | Owner/Manager/Cashier logins, permissions, deactivation, owner password resets, activity history |
| Inventory | Products, categories, SKU/barcodes, purchase/selling prices, tax rates, low-stock thresholds, adjustments and stock history |
| Billing | Barcode entry, customer selection, cash/UPI/card/credit, discounts, tax calculation, partial payments, atomic stock deduction |
| Invoices | Saved price and shop snapshots, history, PDF/print/share, controlled voiding with one stock restoration and refund record |
| Customers | Contact details, opening balance, purchases, payments, outstanding balance, archiving |
| Udhar | Permanent debit/credit entries, partial/full collection, allocation, overdue balances, adjustments, statement PDF, reminder drafts |
| Reports | Date filters, sales/collections, payment methods, GST summary, stock, top products, staff/customer totals, Udhar, CSV/print |
| Operations | Local SQLite storage, backup command, container configuration, CI checks, documented setup |

## Verification of the initial release

- Full backend run: 33 tests passed, including permissions, CSRF, disabled sessions, financial rounding, payment allocation, rollback, snapshots, PDFs, and simultaneous billing.
- After fixing backup file closure on Windows, the targeted concurrency/backup suite passed all 3 tests. There are now 34 backend tests in total; file-backed tests require `TEST_DATABASE_PATH`.
- Frontend TypeScript check, ESLint, and optimized Next.js build passed. Next.js emits a plugin-detection warning during its embedded lint step; the explicit ESLint command loads the Next rules and passes.
- Migration drift check: no changes detected.
- Browser flow: owner setup, product/customer creation, barcode billing, partial payments, invoice history, cancellation, restored stock, ledger balance, dashboard and payment report.
- Exact scenario: opening debt 2,000; invoice 315; initial collection 100; later collections 1,000 and 1,100; remaining debt 115. Void records a 200 refund, clears debt, restores stock from 17 to 20, and leaves net collections 2,000.
- Invoice and statement PDFs were rendered and visually inspected. Browser download-event capture timed out in the in-app browser; the PDF endpoints were independently verified and rendered.
- Mobile dashboard and reports checked at 390 × 844; no page-wide horizontal overflow. Tables scroll within their containers. Mobile navigation was exercised.
- Backup archive restored to a temporary directory; SQLite integrity, invoice status, stock, and ledger total matched.
- The running app uses the empty default database. Synthetic QA data remains isolated in an ignored QA database.

## Design review

The implementation was compared with the generated dashboard concept:

1. White sidebar, pale background, navy headings, and green actions preserved.
2. Four summary cards keep the same order and visual emphasis.
3. Sales/collections chart and attention panel retain the main two-column layout.
4. Recent invoices retain the table layout and status badges.
5. Spacing, borders, typography hierarchy, and account controls follow the concept; mobile uses a collapsible sidebar and stacked panels.

Deliberate differences: live values replace illustrative numbers; explanatory metric labels replace invented growth percentages; a simple chart omits the concept's decorative treatment. Long report ranges aggregate consecutive days without dropping totals.

## Scope limits and deployment work

- Refunds are accounting records; funds are returned separately.
- WhatsApp Cloud API templates, consent checks, signed delivery callbacks and an optional reminder worker are implemented. Activation needs provider credentials and an approved template.
- Domestic goods GST now supports HSN, units, inclusive pricing, state-based components, place of supply and full cancellation credit notes. Return filing, e-invoicing, partial returns and special tax regimes remain outside scope.
- SQLite is intended for one shop on one host. Large datasets have not been load-tested; several screens load complete lists.
- Shared login-throttle storage, encrypted backup scheduling, health checks and HTTPS configuration are implemented. Hosting, external monitoring and off-machine backup copies still require deployment setup. Compose syntax was checked; containers were not run.
- PDFs now include a Devanagari font with shaping; Hindi text, A4 invoices, credit notes and 80 mm receipts were rendered and inspected. Other scripts and physical printers remain unverified.

See [README](../README.md) for startup, financial rules, backups, and deployment settings. The original [audit](PROJECT_AUDIT_REPORT.md) describes the checkout before these changes.

## 30 September 2026 update

Razorpay links and verified payment webhooks, WhatsApp Cloud API reminders, domestic GST, credit notes, thermal PDFs, encrypted backup recovery and deployment configuration have been added. All 52 backend tests pass, including file-backed concurrency. Provider calls are mocked in tests; no live money or messages were sent. See the [complete activation guide](GST_AND_INTEGRATIONS.md) for configuration, verification and remaining limits.
