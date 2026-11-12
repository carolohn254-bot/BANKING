# Real-Time Mobile Banking System — GitHub Pages edition

This edition replaces PHP/MySQL with **HTML, CSS and JavaScript**, plus **Supabase** for hosted authentication and database services. GitHub Pages hosts the front end. It is designed as an academic demonstration only: balances and transactions are simulated; it is not connected to a bank and must never be used to store real banking credentials or money.

## Files
- `index.html` — login, registration and application shell
- `style.css` — responsive design
- `app.js` — front-end behavior and Supabase connection
- `supabase-schema.sql` — database tables, row-level security, account creation trigger and safe simulated deposit/withdrawal function
- `SETUP_GUIDE.md` — setup and publishing instructions

## Before publishing
1. Create a Supabase project.
2. Run `supabase-schema.sql` in Supabase **SQL Editor**.
3. Copy the Project URL and anon/public key from Project Settings → API (or API Keys).
4. Paste them into `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `app.js`. The anon/public key is intended for browser use; never put a `service_role` or secret key in this repository.
5. Enable Email provider in Supabase Authentication. For easiest testing, configure the Site URL and Redirect URLs to your GitHub Pages URL. Email confirmation may be enabled; if so, confirm the registration email before signing in.
6. Push the contents of this folder to a GitHub repository and enable Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
7. Open the Pages URL and test registration, login, dashboard, simulated deposit/withdrawal, transactions, notifications, complaints and logout.

## Create an administrator
Register your own account through the website first. In Supabase → SQL Editor, run this command using the email you registered with:

```sql
update public.profiles set role='admin' where email='YOUR_REGISTERED_EMAIL';
```

Sign out and sign in again. The Administration tab should appear. Do not promote public users in a real application.

## Important limitations
- Transaction form supports simulated deposits, withdrawals and transfers between registered demo accounts. No real money moves.
- SMS/push delivery is not configured; the Notifications page displays in-app notifications stored in Supabase.
- This project is an educational prototype, not production banking software. A production banking system requires professional security review, server-side controls, regulatory compliance, audited transaction processing, monitoring, and integration with licensed financial providers.
- Account-to-account transfers are simulated between two registered demo accounts using their account numbers.
