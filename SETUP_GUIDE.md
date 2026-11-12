# Step-by-step setup and GitHub Pages deployment

## Part 1 — Create the online database
1. Open https://supabase.com and create an account or sign in.
2. Select **New project**. Name it `real-time-mobile-banking`; choose a strong database password and save it privately. Select a region near you if available.
3. Wait until the project is ready.
4. Open **SQL Editor** → **New query**.
5. Open the file `supabase-schema.sql` from this project, copy all its contents, paste into the SQL Editor, then click **Run**. The script creates the tables and access policies.
6. Go to **Project Settings** → **API** (or **API Keys**). Copy the Project URL and the `anon` / `publishable` public key. Never copy a `service_role` or secret key.

## Part 2 — Connect the website to Supabase
1. Open this folder in Visual Studio Code.
2. Open `app.js`.
3. At the top, replace `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE` with your Project URL, keeping the quotation marks.
4. Replace `PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE` with your anon/public key, keeping the quotation marks.
5. Save the file. Do not publish the file until both values have been entered.

## Part 3 — Configure authentication
1. In Supabase, open **Authentication** → **Providers** and ensure Email is enabled.
2. Open **Authentication** → **URL Configuration**.
3. After GitHub Pages gives you the website URL, set **Site URL** to that URL and add it to **Redirect URLs** too.
4. For testing, you may disable email confirmation under Authentication settings; otherwise, users must open the confirmation email before signing in. Re-enable confirmation for a more realistic demonstration.

## Part 4 — Publish on GitHub Pages
1. Sign in at https://github.com.
2. Create a new repository, for example `real-time-mobile-banking`.
3. In the repository, select **Add file** → **Upload files**.
4. Upload `index.html`, `style.css`, `app.js`, and the README. You may also upload the SQL and guide files, but do not upload passwords or secret keys.
5. Commit the files to the `main` branch.
6. Open repository **Settings** → **Pages**.
7. Under Build and deployment, select **Deploy from a branch**; choose branch `main` and folder `/ (root)`; click **Save**.
8. Wait a few minutes and refresh the Pages screen. GitHub will show your published website URL, normally `https://YOUR-USERNAME.github.io/real-time-mobile-banking/`.
9. Return to Supabase URL Configuration and add that exact URL to Site URL and Redirect URLs.
10. Open the GitHub Pages URL in Chrome and test the system.

## Part 5 — Test the system
1. Create a customer account from the Register tab.
2. Confirm the email if confirmation is enabled, then sign in.
3. Confirm the account number and starting simulated balance appear.
4. Test a small simulated deposit and a withdrawal below the available balance. Register a second demo account and test a transfer using its account number.
5. Check Transactions and Notifications; test Complaints; test Sign out.
6. To make your own account an administrator, run this SQL in Supabase SQL Editor after replacing the email:

```sql
update public.profiles set role='admin' where email='YOUR_REGISTERED_EMAIL';
```

Sign out and sign in again to see Administration.

## Troubleshooting
- “Connect Supabase first”: the Project URL and anon/public key are still placeholders or were pasted incorrectly in `app.js`.
- Registration succeeds but sign-in fails: confirm the email if email confirmation is enabled.
- “Account record not found”: make sure the SQL script ran successfully before registering the account. If you registered before running the script, run the SQL first, then register a fresh test account.
- Website shows 404: verify `index.html` is in the repository root and GitHub Pages is set to `main` / root.
- Changes are not visible: wait a few minutes, refresh with Ctrl+F5, and confirm the latest files were committed.

**Security reminder:** This is a simulated student project. Do not use actual bank account details, real customer information, or real money. Never publish a Supabase service-role key or database password.
