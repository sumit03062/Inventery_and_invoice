# Shopbook — single-shop operations

A Next.js + Django application for one retail shop: products, stock history, billing, customers, staff permissions, and a transaction-based Udhar ledger.

## Start locally (Windows PowerShell)

Requirements: Python 3.12+ and Node.js 20.9+.

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe backend/manage.py migrate
.\.venv\Scripts\python.exe backend/manage.py runserver 127.0.0.1:8000
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open **http://127.0.0.1:3001**. The first visit offers owner/shop setup. There is no default password or public registration after setup. Create Manager or Cashier accounts from Staff.

For macOS/Linux, use `python3`, `.venv/bin/python`, and the same Django/npm commands.

The local database is `backend/db.sqlite3`. Uploaded logos are in `backend/media/`. These files and the generated local development secret are ignored by Git. The app contains no seed business data by default.

## Features

- Shop profile, logo, GSTIN, hours, credit terms, invoice prefix/sequence and payment methods.
- Owner, Manager and Cashier accounts, permission overrides, disabling staff, password reset by owner, and activity history.
- Products, categories, SKU/barcodes, purchase/selling prices, taxes, stock movements and low-stock alerts.
- Barcode scanner billing (keyboard input + Enter), before-tax discounts, partial payments, cash/UPI/card/Udhar, PDF/print/share, invoice history and controlled voiding.
- Customer details, invoice history, payment history, opening balances and due dates.
- Append-only customer ledger: sale debits, payment credits, adjustments and reversal entries. Balances are computed from entries.
- Payment allocation to opening/general balances first, then oldest unpaid invoices; overdue balances use unpaid invoices and opening due dates.
- Printable PDF customer statements and WhatsApp reminder drafts. Users review and send messages themselves.
- Daily/weekly/monthly date filters, sales vs collections, GST summary, payment-method breakdown, top products, staff/customer totals, current stock alerts and Udhar reports.

## Financial behavior

- Product selling prices exclude tax. Discounts are fixed invoice amounts applied before tax, distributed across lines in paise using largest remainder. Tax is rounded per line with decimal half-up rounding.
- Invoice prices, taxes, names and business details are saved as snapshots.
- Customer invoices create a debit for the entire total. Cash/UPI/card payments create matching credits. Full cash sales therefore leave zero debt.
- A partial payment records only the amount received; the remainder stays in the ledger. Later collections settle oldest balances.
- Credit adjustments can reduce opening/general balances. To reverse a sale, use invoice voiding.
- Voiding restores stock once, reverses the invoice ledger, and records a refund for payments allocated to that invoice. **The application records refunds; it does not move money.** Staff must return funds using the selected method.
- Sales reports exclude void invoices based on the original sale date. Collections are receipts less refunds based on payment date. Historical sales totals can change after a void. Current outstanding is all-time.
- GST support is a configurable product-rate calculation and summary. This release does not implement GST return filing, e-invoicing, HSN/SAC, place-of-supply rules, or CGST/SGST/IGST splitting.
- Payments and invoices require request UUIDs. Retries reuse the same UUID and payload, preventing duplicate writes.
- All financial writes run in a database transaction. The shop row serializes writes; SQLite uses IMMEDIATE transactions. Keep this SQLite installation to one shop on one host. Migration to a server database requires running the concurrency suite for that database.
- Products/customers are archived; their historical records are retained. Staff are disabled rather than deleted. Invoice and ledger deletion APIs are intentionally absent.

## Checks

```powershell
.\.venv\Scripts\python.exe backend/manage.py check
.\.venv\Scripts\python.exe backend/manage.py test shop
cd frontend
npm run type-check
npm run lint
npm run build
```

Backend tests cover billing, stock rollback, duplicate requests, ledger allocation, partial/full payments, voiding/refunds, authorization, CSRF, staff deactivation, decimal calculations, reports and PDF responses. Set `TEST_DATABASE_PATH` to a new disposable SQLite filename to also run simultaneous billing checks against a file database (CI does this). Django creates and removes that test database; never point it at shop data.

## Backup

```powershell
.\.venv\Scripts\python.exe backend/manage.py backup_shop --output backups/shop-backup.zip
```

This creates a consistent SQLite backup and includes uploaded media. Protect the archive: it contains business/customer data. Store a separate copy outside the application machine.

To restore: stop the backend, preserve the current database/media, extract the archive, replace `backend/db.sqlite3` and `backend/media/` (or your configured paths), run migrations, restart, then reconcile an invoice and customer statement. Do not restore over a running database. Database and media backup are consistent when uploads are paused during the backup.

## Configuration and deployment

The Next.js server proxies same-origin `/api/` requests to `BACKEND_URL`; no browser bearer tokens or cross-origin credentials are needed. Django uses HttpOnly session cookies and explicit CSRF checks on login and setup as well as authenticated mutations.

For production, set `DEBUG=false`, a random `SECRET_KEY`, exact `ALLOWED_HOSTS`, correct `CSRF_TRUSTED_ORIGINS`, and secure cookies behind HTTPS. Python settings read actual environment variables; they do not automatically load a local .env file. Docker Compose loads the root .env.

Dockerfiles and Compose provide an optional single-host deployment. Copy .env.example to .env, configure values, and run `docker compose up --build`. Expose the frontend through your HTTPS reverse proxy; keep the backend private. Persist the shop-data volume. Local HTTP Docker testing requires `COOKIE_SECURE=false`; use secure cookies in production.

The setup endpoint is available only until the first owner exists. Complete setup on a private local deployment before exposing it to other users. Configure production HTTPS, monitoring, backups, and login-rate-limit storage for your deployment before using real shop data.

## Repository

- `backend/config/`: application settings and routes.
- `backend/shop/models.py`: shop, staff, inventory, invoices, ledger and cash records.
- `backend/shop/services.py`: transactional business rules.
- `backend/shop/views.py`: authenticated API and permission enforcement.
- `backend/shop/reports.py`, `documents.py`: summaries, CSV and PDFs.
- `frontend/src/app/`: application screens.
- `frontend/src/components/`: shared shell, tables and forms.
- `md/PROJECT_AUDIT_REPORT.md`: audit of the original incomplete checkout, retained as historical context.

The original empty backend gitlink has been replaced by ordinary source files. No remote backend source was available to recover.
