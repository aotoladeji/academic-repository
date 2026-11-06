# Update guide – logins, admin portal, email, Excel import

What changes:

| Before | After |
|---|---|
| Anyone could open "Manage form" | Admin has a **separate, private portal** at `http://localhost:5173/#/admin` with its own login. There is no link to it on the public site. |
| Anyone could submit | Staff **sign in with PF number + password**. No account? They click **Request an account**. |
| Compare was hidden inside a result | Every result has **Compare with → African publications / Global publications** buttons. |
| — | Admin can: manage form fields, create staff accounts with a default password, **import staff from Excel/CSV**, view full staff info, assign passwords, approve/reject account requests, add/delete publications, **send emails to staff**. |

No package needs to be downloaded. Excel (.xlsx) and CSV files are read with built-in PHP features.

---

## The easy way: copy everything at once

1. **Stop** both servers (press `Ctrl + C` in the `php artisan serve` window and in the `npm run dev` window).
2. Download **`update-pack.zip`**. Inside it are two folders, `backend` and `frontend`, laid out exactly like your project.
3. Right-click the zip → **Extract All…** and choose your `academic-repository` folder as the destination.
4. When Windows asks about files that already exist, choose **Replace the files in the destination**.
5. Skip to **Part 3**.

Prefer to copy file by file? Part 1 and Part 2 list every file. (All paths are inside your `academic-repository` folder. **NEW** = create the file. **REPLACE** = open the old file, delete everything in it, paste the new code.)

---

## Part 1 – Backend files (`academic-repository/backend/`)

| File | Action |
|---|---|
| `database/migrations/2024_02_01_000001_add_login_columns_to_staff_table.php` | NEW |
| `database/migrations/2024_02_01_000002_create_account_requests_table.php` | NEW |
| `database/migrations/2024_02_01_000003_create_messages_table.php` | NEW |
| `app/Models/AccountRequest.php` | NEW |
| `app/Models/Message.php` | NEW |
| `app/Models/Staff.php` | **REPLACE** |
| `app/Http/Middleware/EnsureAdmin.php` | NEW (create the `Middleware` folder if missing) |
| `app/Http/Middleware/EnsureStaff.php` | NEW |
| `app/Services/SpreadsheetReader.php` | NEW |
| `app/Console/Commands/CreateAdmin.php` | NEW |
| `app/Http/Controllers/AuthController.php` | NEW |
| `app/Http/Controllers/AccountRequestController.php` | NEW |
| `app/Http/Controllers/MessageController.php` | NEW |
| `app/Http/Controllers/StaffController.php` | **REPLACE** |
| `app/Http/Controllers/PublicationController.php` | **REPLACE** |
| `routes/api.php` | **REPLACE** |
| `database/seeders/StaffSeeder.php` | **REPLACE** |

Also **delete** `app/Console/Commands/CreateAdminToken.php` (the old token command is no longer used).

## Part 2 – Frontend files (`academic-repository/frontend/src/`)

| File | Action |
|---|---|
| `lib/api.js` | **REPLACE** |
| `lib/auth.jsx` | NEW |
| `lib/useDefaultPassword.js` | NEW |
| `App.jsx` | **REPLACE** |
| `components/StaffPortal.jsx` | NEW |
| `components/StaffLogin.jsx` | NEW |
| `components/AccountRequestForm.jsx` | NEW |
| `components/ChangePassword.jsx` | NEW |
| `components/PublicationSubmission.jsx` | **REPLACE** |
| `components/RepositorySearch.jsx` | **REPLACE** |
| `components/SimilarPublicationsModal.jsx` | **REPLACE** |
| `components/AdminFormManager.jsx` | **REPLACE** |
| `admin/ui.jsx` | NEW (create the `admin` folder inside `src`) |
| `admin/AdminApp.jsx` | NEW |
| `admin/StaffManager.jsx` | NEW |
| `admin/AccountRequests.jsx` | NEW |
| `admin/PublicationsManager.jsx` | NEW |
| `admin/MailCenter.jsx` | NEW |

---

## Part 3 – Run the update (Command Prompt)

Make sure **Apache is not needed** but **MySQL is running** in XAMPP.

**3.1 Build the new tables**
```
cd C:\path\to\academic-repository\backend
php artisan migrate
```
You should see three lines ending in `DONE`. This adds login columns to `staff` and creates `account_requests` and `messages`. Your existing data is kept.

**3.2 Give the sample staff a password**
```
php artisan db:seed --class=StaffSeeder
```
Sample accounts PF1001–PF1004 now have the password `Welcome@123`.

**3.3 Create the administrator** (choose your own email and password, at least 8 characters)
```
php artisan admin:create admin@example.com MyStrongPass123
```

**3.4 Clear Laravel's cache and start the server**
```
php artisan route:clear
php artisan config:clear
php artisan serve
```

**3.5 Start the frontend** (second Command Prompt window)
```
cd C:\path\to\academic-repository\frontend
npm run dev
```

> If `php artisan` complains about **`ZipArchive`** or "zip extension" later when importing Excel: open `C:\xampp\php\php.ini` in Notepad, find the line `;extension=zip`, delete the `;`, save, and restart `php artisan serve`.

---

## Part 4 – Set up email (so staff can receive messages)

Open `backend\.env` and find the lines starting with `MAIL_`. Choose one.

**Just testing (nothing is really sent; messages are written to a log file):**
```
MAIL_MAILER=log
```
Read them afterwards in `backend\storage\logs\laravel.log`.

**Sending real email with Gmail:** turn on 2-Step Verification for the Gmail account, create an **App password** (Google Account → Security → App passwords), then use:
```
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your.address@gmail.com
MAIL_PASSWORD=the-16-letter-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your.address@gmail.com
MAIL_FROM_NAME="Publication Repository"
```
Then run `php artisan config:clear` and restart `php artisan serve`.
A university mail server works the same way: ask your IT office for the SMTP host, port, username and password.

---

## Part 5 – Try everything

**Public site – `http://localhost:5173`**
1. **Browse repository**: each result has *Compare with → African publications / Global publications*.
2. **Submit a publication**: you now see a sign-in screen. Sign in with `PF1001` / `Welcome@123`. You are asked to choose a new password, then the form opens with your details filled in.
3. Sign out, then click **Request an account** and send a request.

**Administrator – `http://localhost:5173/#/admin`** (type this address; it is not linked anywhere)
1. Sign in with the email and password from step 3.3.
2. **Staff**: set the *Default password*, then **Add staff**, or **Import Excel / CSV**. Click **View** on a person to see full details, assign a new password, edit, deactivate or delete.
3. **Account requests**: **Approve** creates the account with the default password and emails the staff member; **Reject** closes it.
4. **Publications**: search, **Delete**, or **Add publication** for any staff member.
5. **Send email**: choose All staff / a Faculty / a Department / specific PF numbers, write the message, send.
6. **Form builder**: the same drag-and-drop editor as before, now private.

### Preparing the Excel file
Row 1 must be headings. Click **Download template** in the import window to see them:

`pf_number | name | department | faculty | designation | email | phone | password`

- Only the first five are required. `password` is optional; empty means the default password is used.
- Use the first worksheet. Save as **.xlsx** (or .csv). Old `.xls` files: open in Excel → Save As → .xlsx.
- Staff already in the system are updated (you can untick this). Rows with problems are skipped and listed so you can fix them.

---

## Troubleshooting

| What you see | Fix |
|---|---|
| Admin page says "Email or password is incorrect" | Run the `admin:create` command again; it also resets the password. |
| `Base table or view not found: account_requests` | You haven't run `php artisan migrate` yet. |
| `Class "App\Http\Middleware\EnsureAdmin" not found` | The two middleware files are missing from `app/Http/Middleware/`. |
| Staff sign-in says incorrect but PF/password are right | Run `php artisan db:seed --class=StaffSeeder` (sample staff), or use **Staff → View → Assign password**. |
| "Unauthenticated" appears in the admin portal | Your session expired; sign in again. |
| Excel import: "could not open the Excel file" | Make sure the file really is .xlsx (not a renamed .xls) and the zip extension is on (see Part 3 note). |
| Emails fail | With `MAIL_MAILER=log` check `storage/logs/laravel.log`. With Gmail, use an App password, not your normal one. |
| Browser shows old behaviour | Press `Ctrl + F5` to hard-refresh. |

## Good to know
- Staff and the administrator are separate logins. A staff token can never open admin features (the server checks).
- When staff submit, the server always uses **their own** account, so nobody can submit as someone else.
- Passwords are stored hashed. The admin can set a new one but can never read an existing one.
- Before going live, use HTTPS and pick a strong admin password.
