# Academic Publication Repository

Laravel 11 REST API + React (Vite) + Tailwind + MySQL 8. Staff submit publications through an admin-designed form; anyone can search the repository and discover similar work on OpenAlex.

## Folder structure

```
academic-repository/
├── README.md                      ← this guide
├── scripts/
│   ├── setup-backend.sh           ← scaffolds Laravel around our files, installs Sanctum, merges .env
│   └── setup-frontend.sh          ← installs npm deps, creates .env
├── backend/                       ← becomes the full Laravel project after setup
│   ├── .env.additions             ← DB / CORS / OpenAlex settings merged into .env
│   ├── app/
│   │   ├── Console/Commands/CreateAdminToken.php   php artisan admin:token
│   │   ├── Http/Controllers/
│   │   │   ├── FormFieldController.php             dynamic-field CRUD + reorder
│   │   │   ├── PublicationController.php           store / list / search
│   │   │   ├── ExternalSearchController.php        OpenAlex proxy
│   │   │   └── StaffController.php                 PF-number lookup
│   │   ├── Models/ Staff.php  FormField.php  Publication.php
│   │   └── Services/OpenAlexService.php
│   ├── config/cors.php
│   ├── database/
│   │   ├── migrations/            staff, form_fields, publications
│   │   └── seeders/               DatabaseSeeder, StaffSeeder, FormFieldSeeder
│   └── routes/api.php
└── frontend/
    ├── .env.example               VITE_API_URL
    ├── index.html  package.json  vite.config.js  postcss.config.js
    ├── tailwind.config.js         brand-light #EAF1FF, brand-primary #8B5CF6, 600 #7C3AED, 700 #6D28D9
    └── src/
        ├── main.jsx  App.jsx  index.css
        ├── lib/api.js             axios client + bearer token
        └── components/
            ├── AdminFormManager.jsx
            ├── DynamicFormBuilder.jsx
            ├── DynamicFormRenderer.jsx
            ├── PublicationSubmission.jsx
            ├── RepositorySearch.jsx
            └── SimilarPublicationsModal.jsx
```

## Launch guide

### 0. Prerequisites
PHP 8.2+ (extensions: `pdo_mysql`, `mbstring`, `xml`, `curl`), Composer 2, Node 18+, MySQL 8.0+.

### 1. Get the code
Unzip the project and open a terminal in `academic-repository/`.

### 2. Create the database
```sql
CREATE DATABASE publication_repo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'repo_user'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON publication_repo.* TO 'repo_user'@'localhost';
FLUSH PRIVILEGES;
```
Using different credentials? Edit `backend/.env.additions` first (step 3 copies it into `.env`).
Also set `OPENALEX_MAILTO` there to a real contact email.

### 3. Build the backend
```bash
bash scripts/setup-backend.sh
```
This creates a Laravel 11 project in `backend/` without overwriting our files, generates `.env` and `APP_KEY`, merges `.env.additions`, installs Sanctum, and registers the OpenAlex config.

*Manual alternative:* `composer create-project laravel/laravel:^11.0 tmp`, copy its contents into `backend/` without overwriting, `cp .env.example .env`, `php artisan key:generate`, add the `.env.additions` lines, `php artisan install:api`, make sure `User` uses `HasApiTokens`, and add `'openalex' => ['mailto' => env('OPENALEX_MAILTO')]` to `config/services.php`.

### 4. Migrate and seed
```bash
cd backend
php artisan migrate --seed
```
Seeds four sample staff (PF1001–PF1004) and four starter form fields.

### 5. Start the API
```bash
php artisan serve          # http://localhost:8000
```
Check: `curl http://localhost:8000/api/form-fields` returns JSON.

### 6. Create an admin token
In a second terminal:
```bash
cd backend && php artisan admin:token
```
Copy the printed token. It is shown once; run the command again for a new one.

### 7. Start the frontend
```bash
bash scripts/setup-frontend.sh
cd frontend && npm run dev     # http://localhost:5173
```
If the API runs elsewhere, change `VITE_API_URL` in `frontend/.env` and `FRONTEND_URL` in `backend/.env` (then `php artisan config:clear`).

### 8. Try it end to end
1. **Manage form** tab → paste the token → *Save token*. Add a field, drag to reorder, toggle required/hidden.
2. **Submit a publication** tab → enter `PF1001` → *Find my record*. Fill in the form, add co-authors, submit.
3. Click **Check for similar publications**; switch between Worldwide, African institutions and One country (e.g. `NG`).
4. **Browse repository** tab → filter by name, PF number, department, faculty, keyword or year; expand a result.

## Production deployment
```bash
# backend
composer install --no-dev --optimize-autoloader
# .env: APP_ENV=production, APP_DEBUG=false, real APP_URL / FRONTEND_URL, strong DB password
php artisan migrate --force
php artisan config:cache && php artisan route:cache
# point the web server (nginx/Apache) document root at backend/public

# frontend
cd frontend && VITE_API_URL=https://api.yourdomain.edu/api npm run build   # serve dist/ statically
```
Before going live: replace the sample `StaffSeeder` with a real import, add a role/gate check to the `admin` route group in `routes/api.php`, serve everything over HTTPS, and run `php artisan schedule`/queue workers only if you add them later (none are required today).

## Deploy to Wasmer Edge (via GitHub)

Each app has its own `wasmer.toml` + `app.yaml`:
- [backend/wasmer.toml](backend/wasmer.toml) / [backend/app.yaml](backend/app.yaml) — PHP runtime, runs `public/index.php` on `:8080`, auto-provisions a managed MySQL database (`capabilities.database`).
- [frontend/wasmer.toml](frontend/wasmer.toml) / [frontend/app.yaml](frontend/app.yaml) / `frontend/Staticfile` — serves the Vite `dist/` build as a static site.

One-time setup:
1. In both `backend/wasmer.toml`/`app.yaml` and `frontend/wasmer.toml`/`app.yaml`, replace `YOUR_WASMER_USERNAME` with your actual Wasmer namespace/username.
2. `wasmer login`, then `wasmer app secrets create APP_KEY "$(php -r 'echo "base64:".base64_encode(random_bytes(32));')" --app-dir backend` (one-time; not stored in the repo).
3. In the GitHub repo settings:
   - **Secrets** → add `WASMER_TOKEN` (from `wasmer login` / the Wasmer dashboard → Account → Access Tokens).
   - **Variables** → add `VITE_API_URL` = `https://academic-repository-api-YOUR_WASMER_USERNAME.wasmer.app/api`.
4. Push to `main` — [.github/workflows/wasmer-deploy-backend.yml](.github/workflows/wasmer-deploy-backend.yml) and [.github/workflows/wasmer-deploy-frontend.yml](.github/workflows/wasmer-deploy-frontend.yml) build and `wasmer deploy --non-interactive` each app automatically (path-filtered, so each only redeploys when its folder changes).
5. After the first backend deploy, run migrations against the provisioned database: `wasmer app database list --with-password --app-dir backend` to get `DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD`, export them locally, then `php artisan migrate --seed --force`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Browser console shows a CORS error | `FRONTEND_URL` in `backend/.env` must equal the exact frontend origin; run `php artisan config:clear`. |
| Manage form tab says “Unauthenticated” | Re-run `php artisan admin:token`, paste the new token, click *Save token*. |
| `Class "Laravel\Sanctum\HasApiTokens" not found` | `composer require laravel/sanctum`, then re-run `php artisan install:api`. |
| `SQLSTATE[HY000] [1045]` | DB credentials in `backend/.env` don't match step 2. |
| Similar publications returns 502 | The server can't reach `api.openalex.org`; check outbound network/firewall. |
| "No staff record found" | Seed ran? Use `PF1001`, or add rows to the `staff` table. |

## Design notes
- `publications.co_authors` (JSON) was added to the requested schema to store contributors.
- `form_fields.field_key` is generated from the label and never changes, so saved values stay linked; deleting a field keeps old values in the JSON but stops showing them.
- Server-side validation is generated from the active form fields on each request, so required flags are enforced by the API too.
- The similarity percentage is a blend of title-word overlap (60%) and OpenAlex relevance (40%). It is a ranking aid, not a plagiarism check.
