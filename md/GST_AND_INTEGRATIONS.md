# GST, Razorpay and WhatsApp implementation

Updated 30 September 2026. This release adds working application code and local verification. Provider accounts, live transactions, hosting and physical printers have not been tested.

## What is implemented

- Domestic retail GST: shop/customer states, place of supply, HSN and unit, inclusive/exclusive prices, CGST + SGST or UTGST, and interstate IGST. Saved invoices retain their original details.
- Numbered credit notes for full invoice cancellation, with stock restoration and ledger reversal exactly once.
- GST register and CSV: invoice debits on invoice date and credit notes on credit-note date. This differs from the sales report, which excludes void sales retrospectively.
- A4 PDFs and 80 mm PDF receipts, with bundled Noto Sans Devanagari and text shaping. Hindi customer text was visually checked. Other scripts and actual printer margins need device-specific checks.
- Razorpay payment links, signed capture webhooks, duplicate protection, and a receipt reconciliation list in Settings.
- WhatsApp approved-template reminders, consent records, delivery history, signed status webhooks, and optional scheduled reminders.
- Encrypted backups, a maintenance command, shared database-backed login throttling, health endpoint, and an optional Caddy HTTPS deployment configuration.

## Upgrade

Back up the existing shop before running migrations. Install the updated requirements and run:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe backend/manage.py migrate
cd frontend
npm ci
npm run build
```

Existing shops retain BASIC tax mode. Select Domestic GST in Settings after entering the shop GSTIN, address and state; set product HSN codes and customer states. Existing managers need the new `reminders.send` permission assigned by the owner. New managers receive the default permission set.

Domestic mode covers ordinary domestic retail goods. It does not implement exports/SEZ, reverse charge, cess, composition schemes, service-specific place-of-supply rules, return filing, IRN/e-invoicing, or partial-return credit notes. Have the shop's accountant review its rates and document particulars before using this mode for real invoices. Invoice/credit-note sequences are continuous; automatic financial-year reset is not implemented.

Inclusive rates are converted to a taxable base rounded to paise; the invoice discount is then allocated before component tax rounding. A paise difference from a simple inclusive-price multiplication is possible. GST components are rounded independently per line.

## Razorpay activation

Keep secrets in server environment variables or the deployment's private `.env`; never enter them in the browser or commit them.

1. Start with Razorpay test credentials. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and an independent `RAZORPAY_WEBHOOK_SECRET`; set `RAZORPAY_ENABLED=true`.
2. Register `https://YOUR_DOMAIN/api/webhooks/razorpay/` with the same webhook secret. Subscribe to `payment_link.paid`, `payment_link.expired`, and `payment_link.cancelled`.
3. Restart the backend. Settings shows readiness and test/live mode; readiness confirms configuration presence, not account connectivity.
4. Create a customer credit invoice and select **Create Razorpay link**. Complete a test payment in Razorpay's test environment, then verify one ONLINE collection and one ledger payment entry. Redelivering the event must not duplicate either.
5. Switch to live keys only after test reconciliation succeeds, and configure the live webhook separately.

The server creates INR links for the full remaining invoice balance, with a 24-hour expiry. Provider SMS/email notifications and automatic provider reminders are disabled. Creating or copying a link does not send it. Only a signed webhook containing a captured payment of the expected amount applies the collection.

The UI and API reuse pending links. An uncertain network response produces UNKNOWN and prevents blind retry. Check Razorpay's dashboard before resolving such requests. If the process stops during creation, a link can remain CREATING and also requires provider reconciliation.

**Late payments:** if someone pays an old link after a manual collection or invoice void, the captured money is recorded as REVIEW in Settings without changing the customer's ledger. Resolve it in Razorpay and reconcile the app records. Cancel any remaining payable link in the Razorpay dashboard when collecting separately or voiding its invoice. There is no in-app provider cancellation/refund API or review-resolution workflow in this release. App refund entries record money returned separately.

## WhatsApp Cloud API activation

1. Configure a Meta business app and WhatsApp sender. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, and a currently supported `WHATSAPP_GRAPH_VERSION` from the app dashboard.
2. Obtain approval for a reminder template with exactly three body text parameters, in this order: customer name, shop name, outstanding amount. Example body: `Hello {{1}}, your outstanding balance at {{2}} is INR {{3}}. Please contact the shop if you have already paid.` Set `WHATSAPP_TEMPLATE` and its exact language code in `WHATSAPP_LANGUAGE`.
3. Configure `https://YOUR_DOMAIN/api/webhooks/whatsapp/` using the verify token, and subscribe to message status events. POST callbacks are checked against the app secret.
4. Set `WHATSAPP_ENABLED=true`, restart, and record the customer's consent and how it was obtained in their profile. Changing their phone clears consent.
5. Test with a consenting test recipient. Review the confirmation in the customer profile, send, and check SENT/DELIVERED/READ status. No live messages were sent during development.

The default interval is 72 hours per customer (`REMINDER_INTERVAL_HOURS`, minimum 24). Positive outstanding balance, active customer and consent are checked before queueing and again before sending. Ten-digit mobile numbers get India's +91 prefix. UNKNOWN responses are not automatically retried to avoid duplicate messages. A process interrupted while SENDING needs manual provider inspection.

Automatic reminders are off by default. Preview eligible overdue customers with:

```powershell
.\.venv\Scripts\python.exe backend/manage.py send_reminders
```

Enable `AUTOMATIC_REMINDERS=true` only after confirming the template, consent workflow and schedule. `send_reminders --send` sends eligible reminders and processes queued ones. Run one maintenance worker per shop; it checks every five minutes and respects each customer's minimum reminder interval.

## Encrypted backups and maintenance

Generate a Fernet key locally with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` and store it securely outside the backup location as `BACKUP_ENCRYPTION_KEY`. Losing this key makes encrypted backups unreadable.

```powershell
.\.venv\Scripts\python.exe backend/manage.py backup_shop --encrypt --output backups/shop.zip.enc
.\.venv\Scripts\python.exe backend/manage.py decrypt_backup --input backups/shop.zip.enc --output backups/restored.zip
```

Decryption writes a new ZIP and never changes the live database. Follow the offline restore procedure in README. A roundtrip restore and rejection of the wrong key were tested.

Set `BACKUP_DIRECTORY` to a writable directory and run `run_maintenance` for one encrypted backup per local day. `run_maintenance --once` performs one cycle and exits. Copy backups off the machine and define retention separately; this worker does not upload or prune archives. Monitor process logs and backup freshness. Uploads should be paused for a fully consistent database/media snapshot.

## Optional single-host HTTPS deployment

Copy `.env.example` to `.env`, set a strong `SECRET_KEY`, `SHOP_DOMAIN`, and `ALLOWED_HOSTS` containing the domain plus `backend`, `localhost`, and `127.0.0.1`. Complete initial owner setup on a private local deployment first. Point the domain to the server and allow ports 80/443. Then:

```sh
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build -d
docker compose -f docker-compose.yml -f docker-compose.production.yml --profile maintenance up -d maintenance
```

The second command is optional and requires the backup key and a host `backups` directory writable by the container user. The backend stays on the internal container network; Caddy handles HTTPS. The health endpoint is `/api/health/`. Use one SQLite host and one maintenance worker. Restrict access to Docker and the data volume. Add external uptime/error monitoring and test restore on the actual server.

Compose syntax was validated without resolving a private `.env`; container images, TLS issuance and public webhook reachability were not exercised here. Large datasets remain untested, and some screens load full lists.

## Verification

- 52 backend tests passed, including file-backed simultaneous billing, permissions, GST variants, snapshots, credit notes, signed/duplicate/mismatched webhooks, late-capture review, consent, malformed provider responses, and encrypted backup recovery.
- Frontend TypeScript, ESLint and optimized production build passed. Migration drift and whitespace checks passed. Next's embedded lint step reports a plugin-detection warning; the separate ESLint command passes.
- Browser: two units at INR 118 inclusive, INR 10 pre-tax discount, taxable value INR 190, CGST INR 17.10, SGST INR 17.10, total INR 224.20. Full cancellation created CN-000001, cleared debt, and restored stock in the isolated QA database.
- A4 invoice, thermal receipt and credit note rendered and visually inspected. Provider requests in automated tests are mocked; live connectivity remains unverified.

## References

- [CBIC invoice particulars](https://cbic-gst.gov.in/gst-invoice-rules.html).
- [Razorpay standard payment links](https://razorpay.com/docs/api/payments/payment-links/create-standard/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/), and [payment-link events](https://razorpay.com/docs/webhooks/payment-links).
- [Meta template message structure](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/template/). Confirm current Graph API version and template approval in your Meta account.
- [Noto Devanagari font project](https://github.com/notofonts/devanagari); bundled font includes its OFL license.
