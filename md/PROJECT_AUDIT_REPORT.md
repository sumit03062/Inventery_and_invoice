# Project audit and project goal

**Audit date:** 28 September 2026  
**Project:** Mall Invoice Generator / Invoice Manager  
**Reviewed revision:** `ee1dda6`  
**Assessment:** Incomplete checkout with substantial frontend implementation; not ready for production or end-to-end verification.

## 1. Goal of the project

The project aims to give retail shops one place to manage products, stock, customers, invoices, and sales reports. Its main business goal is to reduce manual billing work and keep sales records and inventory consistent.

The intended daily workflow is:

1. Register a business and sign in.
2. Configure the shop's name, contact details, address, and GST information.
3. Add products with prices, tax rates, stock quantities, and low-stock thresholds.
4. Record customers or enter a customer name during billing.
5. Create an invoice from products and quantities.
6. Calculate totals and tax, save the invoice, and deduct stock reliably.
7. Download a PDF invoice; void an incorrect invoice with controlled stock restoration.
8. Review sales totals, tax collected, trends, and CSV exports.

**Primary audience:** Shop owners and staff handling retail sales, especially shops using rupee pricing and GST fields. The README also describes a multi-shop mall system. Accountants and administrators are intended secondary users, but their roles and permissions cannot be verified in this checkout.

**Recommended first delivery target:** A reliable shop billing workflow, with tested separation between businesses if multiple shops use the same deployment. Consolidated mall reporting and advanced staff management should have explicit requirements before being considered complete.

Payment collection, receivables, purchase orders, supplier management, stock transfers, returns/refunds beyond voiding, and accounting integrations are not implemented in the available frontend. Decide separately whether they belong in the product scope.

## 2. What was audited

Reviewed the available application source, route structure, authentication flow, data fetching and mutations, types, forms, styles, dependency manifests and lockfile, Docker Compose configuration, Git tracking, README, and business documentation.

The frontend contains 21 source files, including an empty `src/context/AuthContext.tsx`. The active authentication implementation is `src/hooks/useAuth.tsx`.

### Important limits

- `backend/` is empty. Git records it as a gitlink to commit `8dfd7290fe4ffcf979766397ca303d7cbad02b98`, but the repository has no `.gitmodules` mapping. Backend models, endpoints, migrations, permissions, tests, PDF generation, and transaction behavior are unavailable for inspection.
- `frontend/src/lib/api` and `frontend/src/lib/utils` are missing despite imports throughout the application.
- Frontend dependencies are not installed. Build, lint, and type-check commands were attempted but could not start their tools.
- No running application, browser interaction, API request, database operation, concurrency test, or generated PDF was verified.
- No dependency vulnerability scan or legal/tax compliance assessment was performed. Dependency versions below are local lockfile facts, not an assessment of current security support.

This report covers the available checkout. Documentation and UI claims are not treated as proof that server behavior exists.

## 3. Architecture and repository structure

| Area | Available evidence | Assessment |
|---|---|---|
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS | Main implementation available |
| Data access | React Query; imports of a shared API client | API client missing |
| Authentication | JWT login calls, browser cookies, auth context, route middleware | Partial frontend implementation |
| Backend | Django/DRF/SimpleJWT in `requirements.txt` | Source unavailable |
| Database | MySQL 8 service in Compose, PyMySQL dependency | Actual schema/configuration unknown |
| Background services | Redis 7 in Compose; Celery dependency | No worker configuration or task code available |
| PDF support | ReportLab, WeasyPrint, pypdf dependencies; download button | Generation unavailable to inspect |
| Reports | Recharts graphs and API calls | Calculations depend on missing backend |
| Deployment | Compose starts MySQL and Redis only | No application deployment definition |
| Documentation | README and four business/learning documents | Useful intent; many unsupported completion claims |
| Static files | Collected Django admin/DRF assets | Do not establish that backend source is present |

Selected resolved frontend versions: Next.js **15.5.15**, React **19.2.5**, TypeScript **5.9.3**, ESLint **9.39.4**, Axios **1.15.2**, Tailwind CSS **4.2.4**. Python requirements declare Django **5.0.1**, DRF **3.14.0**, and SimpleJWT **5.5.1**.

Intended dependency flow:

```text
Shop user
  -> Next.js pages and forms
  -> shared API client [missing]
  -> Django API [missing]
  -> database, invoice calculations, stock updates, PDF generation
```

## 4. Feature status

“Frontend present” means code exists; it does not mean the complete feature passed a runtime test.

| Feature | Status in this checkout |
|---|---|
| Landing page | Present; contains static example metrics and marketing claims |
| Login | Form and token/user calls present; blocked by missing API client/backend |
| Registration | `/register` posts shop/user fields; login-page signup is a placeholder |
| Dashboard | Daily statistics request and cards present; activity section is explanatory text |
| Products | Create, edit, delete, search, stock values, low-stock display present |
| Customers | Create, edit, delete and contact cards present; no customer history view |
| Invoices | Item form, customer selection, list, void request, PDF request present |
| Tax and stock processing | Intended server responsibility; cannot verify |
| Reports | Date/period statistics, trend charts, print and CSV actions present |
| Shop settings | Form present; missing `Shop` type blocks compilation |
| Multiple shops and roles | Claimed in documentation; isolation and permissions unverified |
| Automatic token refresh | Claimed on landing page; implementation unavailable |
| Backups and audit history | Claimed in business documents; no implementation supplied |

## 5. Prioritized findings

Priorities: **P0** prevents establishing a runnable baseline; **P1** affects account boundaries or core business correctness; **P2** affects reliability and usability; **P3** covers smaller maintenance issues. Findings are from source inspection unless a command result is stated.

### A01 — P0: Backend source is absent

**Evidence:** `git ls-tree HEAD backend` returns mode `160000`; `backend/` contains zero entries; `.gitmodules` does not exist.

The documented backend startup commands cannot work from this checkout. The backend may exist in another repository, but its location is not provided here.

**Action:** Recover the intended backend and either track its source normally or configure a reproducible submodule. Verify a clean clone contains `manage.py`, settings, application code, migrations, and tests.

### A02 — P0: Shared frontend modules are missing and ignored

**Evidence:** `frontend/src/hooks/useAuth.tsx:6` imports `@/lib/api`; `frontend/src/components/ui/auth-switch.tsx:5` imports `@/lib/utils`. Both targets are absent. `git check-ignore -v` identifies `.gitignore:18`, the unanchored `lib/` rule, as excluding both paths.

The frontend cannot resolve these imports. The ignore rule also prevents normal tracking when the files are restored. This explains an omission mechanism, although it does not prove how the files were originally lost.

**Action:** Scope the Python library ignore rule appropriately, restore the API client and utility module, and confirm they are tracked. Review API base URL handling, token attachment, refresh, response types, and error normalization in the recovered client.

### A03 — P0: Shared type definitions are incomplete

**Evidence:** `frontend/src/app/(dashboard)/settings/page.tsx:5` imports `Shop`, which is not exported by `src/types/index.ts`. That types file uses unimported `ReactNode` at line 64.

These are source-level compilation blockers in addition to the missing modules. `Invoice.customer_name` should describe API data, usually a string or nullable string, rather than arbitrary UI content. `CreateInvoiceInput` also omits customer and notes fields actually submitted by the form.

**Action:** Define the API contract and align shared types, including money representation, shop data, customer fields, and invoice creation payloads.

### A04 — P1: Cached data survives account changes

**Evidence:** `src/providers/QueryProvider.tsx:8` creates one persistent query client with a 60-second freshness window. Query keys such as `['products']`, `['customers']`, `['invoices']`, and `['shop-settings']` contain no account identifier. `src/hooks/useAuth.tsx:98` clears auth state but never clears the query cache.

Within the same application session, switching accounts can display a previous user's cached business data. The navbar's login form also permits another login without an explicit sign-out. Backend authorization cannot prevent data already stored in a browser cache from being shown.

**Action:** Cancel and clear account-specific queries on auth changes, scope keys to account/shop identity, and gate business queries on resolved authentication. Test account A to account B switching without reloading the browser.

### A05 — P1: Route protection is inconsistent

**Evidence:** `frontend/middleware.ts:7` and its matcher include dashboard, invoices, products, and reports, but omit customers and settings. `src/app/(dashboard)/layout.tsx` provides no auth guard. Middleware checks only cookie presence, not token validity.

Anonymous users can reach the omitted page shells, and those pages attempt data requests. A fabricated cookie can satisfy the other route checks. This does **not** establish an API authorization bypass: the missing backend must independently validate tokens and enforce shop ownership and roles.

**Action:** Cover every business route and handle invalid sessions consistently. Verify authorization separately on every API operation, especially invoice voiding, exports, shop settings, and object access by ID.

### A06 — P1: Session handling needs security and lifecycle work

**Evidence:** `src/hooks/useAuth.tsx:73` stores access and refresh tokens through JavaScript cookies with expiration days but no explicit `secure` or `sameSite` settings. JavaScript-created cookies cannot be HttpOnly. User-fetch failure clears auth state; some failure paths leave the API client's default Authorization header set.

An injected script could read both tokens. Network failures are also treated as session failures. The missing client prevents verifying refresh-token rotation, expiry handling, or automatic refresh.

**Action:** Establish a deliberate session design, preferably server-managed HttpOnly cookies with appropriate CSRF handling. Align token/cookie lifetimes, clear headers on every failed session transition, and test expiry, refresh failure, offline behavior, and logout. Do not assume the visible demo credentials correspond to a real account; verify and remove public demo access from production.

### A07 — P1: Login and account navigation are unfinished

**Evidence:** `src/components/ui/auth-switch.tsx:94` always rejects signup as unavailable, while `/register` implements a registration request. `src/components/Navbar.tsx:79` and `:113` mount the entire auth form. `AuthSwitch` reads only `login` and has no signed-in or logout branch.

Users taking the signup path from login hit a dead end. Business navigation shows a full login form inside a fixed-height header, and no rendered control calls the existing logout function.

**Action:** Connect signup to the registration flow and replace the navbar form with account information and a sign-out action. Check both desktop and mobile layouts after the app builds.

### A08 — P1: Invoice quantity validation is insufficient

**Evidence:** `src/app/(dashboard)/invoices/page.tsx:178` has no positive minimum. Its handler uses `parseInt(value) || 1`; submission filters only for a selected product.

Negative quantities can be submitted, zero silently becomes one, duplicate products are not combined or checked, and available stock is not checked in the form. Whether invalid invoices persist depends on the unavailable backend.

**Action:** Require positive integer quantities, validate combined quantities per product, show available stock and a totals preview, and surface server validation messages. Server-side stock updates must be atomic and authoritative. Repeated create/void requests also need protection against duplicate effects.

### A09 — P2: Paginated records are treated as the complete dataset

**Evidence:** Products, customers, and invoices read only `response.data.results`; no page navigation or next-page fetching exists. Product counts, stock value, search, and invoice product/customer selectors use that array.

If the API paginates, later records are inaccessible and inventory summaries describe only the loaded page. Actual backend pagination settings are unknown.

**Action:** Define pagination explicitly, use server search and aggregates, and provide pagination or searchable selectors. Test with more records than one API page.

### A10 — P2: Request failures look like empty or successful business states

**Evidence:** Product and dashboard queries capture error flags but do not render them. Other business pages mostly default failed queries to empty arrays or zero totals. Dashboard `page.tsx:63` always displays “System Online.”

Users can mistake failed requests for no sales or no inventory. Route error boundaries do not automatically handle errors retained by React Query.

**Action:** Render loading, empty, error, and retry states explicitly. Base service status on a real signal or remove the status claim.

### A11 — P2: Reports can show stale or inconsistent results

**Evidence:** Invoice create/void mutations invalidate only invoices and products, not `dashboard-stats` or `reports`. Dashboard and reports use `toISOString()` to derive the default day. CSV export sends no selected date/period parameters.

Reports can reuse cached pre-sale totals. In the configured India context, between midnight and 05:29 local time, the ISO date is still the previous UTC day. An export is not explicitly scoped to the visible report filters. The dashboard cache key also lacks its date.

**Action:** Invalidate dependent aggregates, use the business timezone and date in query keys, define midnight refresh behavior, and make export scope explicit and consistent with the UI. Confirm decimal serialization before calling `.toFixed()` on API values.

### A12 — P2: Product and customer forms have correctness gaps

**Evidence:** Product price inputs lack a decimal `step`; GST values are parsed with `parseInt`. Price/GST/stock validation errors are stored, but only the name error is displayed. Low-stock threshold exists in state without an editable field. The customer header toggles form visibility without resetting the selected edit record.

Decimal prices can fail browser validation, fractional tax rates are truncated, and invalid submissions can appear to do nothing. After editing a customer and using the header Cancel/Add sequence, the next form can remain attached to the previous customer.

**Action:** Set numeric precision deliberately, show every field error, expose supported threshold settings, and reset customer edit state when starting a new record.

### A13 — P2: Settings fetches can overwrite an in-progress edit

**Evidence:** `src/app/(dashboard)/settings/page.tsx:18` calls `setFormData` inside the query function.

A background refetch can replace unsaved user changes. Conversely, mounting from a fresh cached query may leave the initially empty form unpopulated because the query function does not run.

**Action:** Initialize the form from loaded/cached data separately and protect dirty fields from refetches. Provide an explicit reset/reload action.

### A14 — P2: Delivery and regression controls are incomplete

No application test files, test script, CI workflow, backend migration files, Dockerfiles, deployment guide, backup job, or restore procedure were found in the available checkout. Compose defines infrastructure only. Database credentials are literal development values, and database/Redis ports are published without a loopback-only binding.

**Action:** Establish reproducible setup and automated checks, provide environment-specific secrets/configuration, restrict infrastructure exposure appropriately, and document application deployment and tested restore procedures. Dependency declarations alone do not prove testing, backups, or background jobs exist.

### A15 — P2: Documentation overstates readiness

The README calls the project “production-grade,” points to a missing deployment guide, and installs `requirements.txt` after changing into the empty backend directory even though the file is at repository root. The learning index references many absent files and another machine's output directory. Business documents claim automatic backups, accountability, and numerical business outcomes without supporting implementation or measurements here.

The dashboard footer says Next.js 14, the manifest declares Next.js 15, and the landing page lists SQLite while Compose defines MySQL.

**Action:** Rewrite setup from a clean-clone test, separate implemented features from planned features, label examples as examples, and align architecture/version descriptions with the recovered application. GST fields and PDF labels alone do not establish compliance.

### A16 — P3: Accessibility and maintenance cleanup

- Root viewport uses `maximumScale: 1`, which can limit user zoom where honored.
- Many business form labels lack `htmlFor`/input IDs; customer inputs rely on placeholders, and some icon buttons lack accessible names.
- Password visibility controls are removed from normal keyboard tab order.
- PDF/CSV object URLs are not revoked after downloads.
- The landing navigation links to `#pricing`, but no matching section exists.
- Landing grids and navigation use fixed multi-column layouts that need mobile testing.
- Two ESLint configurations and two color definitions exist; remove obsolete configuration after confirming the intended setup.
- The empty auth context file and tracked generated static assets add maintenance noise.

Address these after restoring the runnable baseline and core flows. Actual rendered layout and bundle performance still require measurement.

## 6. Expected API surface

These are frontend expectations, not verified server routes. The default configured base URL is `http://localhost:8000/api`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/token/` | Login |
| GET | `/users/me/` | Current user |
| POST | `/users/register/` | Register user and business |
| GET, POST | `/products/` | List/create products |
| PATCH, DELETE | `/products/{id}/` | Update/delete product |
| GET, POST | `/customers/` | List/create customers |
| PATCH, DELETE | `/customers/{id}/` | Update/delete customer |
| GET | `/invoices/` | List invoices |
| POST | `/invoices/create/` | Create invoice |
| POST | `/invoices/{id}/void/` | Void invoice |
| GET | `/invoices/{id}/pdf/` | Download PDF |
| GET | `/reports/daily-sales/` | Date/period aggregates |
| GET | `/reports/sales-trend/` | Daily/monthly trends |
| GET | `/reports/export-csv/` | Export sales |
| GET, PATCH | `/shops/my_shop/` | Read/update business settings |

The recovered backend should confirm request fields, pagination, response types, permissions, error responses, and refresh behavior against this list.

## 7. Verification results

| Check | Result |
|---|---|
| Initial Git status | Clean |
| Backend Git entry and directory inspection | Gitlink confirmed; directory empty; `.gitmodules` absent |
| Shared-module ignore check | Both missing module paths match root `.gitignore:18` |
| `npm run type-check` | Could not run: `tsc` unavailable |
| `npm run lint` | Could not run: `next` unavailable |
| `npm run build` | Could not run: `next` unavailable |
| Frontend dependency directory | `node_modules` absent |
| `docker compose config --quiet` | Exit 0; obsolete `version` warning and local Docker config access warning |
| Backend tests / migrations | Not runnable: source absent; Python command also not found on PATH |
| Browser, PDF, database and concurrency tests | Not performed; runnable baseline unavailable |

Compose syntax validation does not mean services were started or application connectivity passed. The npm results are environment blockers, not compiler diagnostics. The source blockers in A02/A03 were identified independently by inspection.

## 8. Recovery and implementation order

### Phase 1 — Restore a reproducible project

1. Recover the backend and fix Git/submodule tracking.
2. Correct the `lib/` ignore rule and restore missing frontend modules.
3. Repair shared types and confirm frontend/backend contracts.
4. Install locked dependencies and run type check, lint, build, backend checks, migrations, and tests.
5. Replace setup instructions with commands verified from a clean clone.

**Exit condition:** A new developer can start both applications and complete a test login without undocumented local files.

### Phase 2 — Make the billing workflow reliable

1. Finish registration, account navigation, logout, route guards, and account cache separation.
2. Fix validation, decimal handling, pagination, and request error displays.
3. Verify server-calculated totals, immutable invoice item price/tax snapshots, atomic stock deduction, and exactly-once stock restoration when voiding.
4. Align dashboard/report refresh, business dates, and CSV scope.
5. Verify shop settings appear correctly on PDF invoices.

**Exit condition:** Create product/customer -> create invoice -> verify stock/totals -> download PDF -> void invoice -> verify stock/report correction works end to end.

### Phase 3 — Establish deployment readiness

1. Test that users cannot read or modify another shop's records, including IDs, reports, PDFs, and exports.
2. Define and test staff permissions if staff roles are in scope.
3. Add regression checks to CI, production configuration, logging, health checks, backups, and restore testing.
4. Complete responsive and keyboard accessibility checks.
5. Replace unsupported product claims with verified capabilities.

**Exit condition:** A documented deployment passes functional, authorization, recovery, and operational checks.

## 9. Acceptance checks for the project goal

- A shop owner can register, sign in, configure the shop, and sign out.
- An anonymous or expired session cannot access protected API data.
- Switching accounts never displays the prior account's cached records.
- Product/customer selection and searches work beyond the first result page.
- Decimal prices and supported tax rates round consistently between API, invoice, PDF, and reports.
- Invalid/negative/duplicate line quantities cannot create invalid stock changes.
- Two simultaneous sales cannot oversell the last available stock.
- A repeated create request does not accidentally generate duplicate sales, and repeated void requests cannot restore stock twice.
- Changing a product later does not rewrite the historical invoice's price/tax details.
- Dashboard, reports, and exports agree for the same business date and period.
- API failures display useful errors instead of false zero-sales results.
- A backup can be restored and reconciled with invoices and stock records.

## 10. Overall conclusion

The project has a clear retail billing goal and a useful frontend foundation covering the main business screens. Its immediate problem is repository completeness: essential backend and shared frontend code are missing, and additional source defects prevent a reliable baseline.

The next milestone should be a reproducible, tested invoice-and-stock workflow. Feature expansion should follow that milestone. The available evidence does not support describing this checkout as production-ready.
