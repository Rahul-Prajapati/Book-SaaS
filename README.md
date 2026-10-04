# BookStore AI

BookStore AI is a subscription-based digital book platform. Readers can browse books, listen to chapter audio, manage favorites and reviews, and download PDFs with a paid plan. Administrators manage books, categories, reviews, users, and subscription requests.

## Features

- User registration and sign-in, with separate user and admin experiences.
- Book catalog with categories, search, book details, reviews, ratings, and favorites.
- Admin book and category management, including PDF and cover uploads to Cloudinary.
- AI-assisted book summaries and generated chapter audio through OpenRouter.
- Monthly, yearly, and lifetime subscription plans.
- Manual bank-transfer receipt submission with admin review, plus Stripe test-mode payments.
- Protected PDF downloads for signed-in users with a non-free subscription tier.

## Technology

- Next.js 16 App Router, React 19, and TypeScript
- MySQL with Prisma 6
- Auth.js credentials authentication
- Stripe Payment Element and signed webhooks (test mode only)
- Cloudinary for book assets
- OpenRouter for summary and audio generation

## Prerequisites

- Node.js 20.9 or newer and npm
- MySQL 8 or a compatible MySQL server; XAMPP is suitable for local development
- Optional service accounts: Cloudinary, OpenRouter, and Stripe test mode

## Local setup on Windows with XAMPP

1. Clone the repository and open PowerShell in the project folder.

2. In XAMPP Control Panel, start **MySQL**. In phpMyAdmin, create a database named `book_store` using `utf8mb4`.

3. If you do not already have a `.env`, copy the template and fill in the values you have. If `.env` exists, keep it and add any missing variables manually; do not overwrite working credentials.

   ```powershell
   Copy-Item .env.example .env
   ```

   The example database URL assumes XAMPP's default MySQL port `3306` and a `root` account with no password. Change the URL if your MySQL port, username, or password differs. URL-encode special characters in the password.

4. Install the locked dependencies:

   ```powershell
   npm ci
   ```

5. Synchronize the Prisma schema with the local database and create the development admin account and starter categories:

   ```powershell
   npx prisma db push
   npx prisma generate
   npx prisma db seed
   ```

   `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` are required for seeding. The seed creates or updates the configured account as an `ADMIN` with lifetime access and resets its password to the configured value each time the seed runs. Use a dedicated admin email, a strong local password, and never reuse it in production.

6. Start the development server:

   ```powershell
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | App and Prisma | MySQL connection string, for example `mysql://root:@localhost:3306/book_store`. |
| `NEXTAUTH_SECRET` | Authentication | Use a unique random secret. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `NEXTAUTH_URL` | Local authentication | Usually `http://localhost:3000` for local development. |
| `SEED_ADMIN_EMAIL` | Database seed | Email for the seeded administrator. |
| `SEED_ADMIN_PASSWORD` | Database seed | Password assigned to that administrator when seeding. |
| `CLOUDINARY_CLOUD_NAME` | Uploads and PDF downloads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Admin uploads | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Admin uploads | Cloudinary API secret; keep it server-side. |
| `OPENAI_API_KEY` | AI summary and audio generation | Use an OpenRouter API key; the server uses OpenRouter's OpenAI-compatible API. |
| `LLM_MODEL_NAME` | AI book summaries | OpenRouter model identifier used for the main summary request. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe checkout UI | Stripe **test** publishable key (`pk_test_...`). |
| `STRIPE_SECRET_KEY` | Stripe payment API and webhook | Stripe **test** secret key (`sk_test_...`). Live keys are rejected by the current integration. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook processing | Signing secret provided by Stripe CLI or your Stripe webhook endpoint. |

The app can run without Cloudinary, OpenRouter, or Stripe credentials, but the corresponding upload, AI-generation, and Stripe-payment features will not work. Stripe keys are needed only when testing Stripe checkout; manual bank-transfer receipt review uses the existing subscription workflow.

## Stripe test payments

1. Add Stripe test-mode keys to `.env` for `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`.
2. For local webhook testing, install and sign in to [Stripe CLI](https://docs.stripe.com/stripe-cli), then forward events to the app:

   ```powershell
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Copy the `whsec_...` value printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET` and restart the Next.js server after changing `.env`.
4. Use Stripe's [test card numbers](https://docs.stripe.com/testing) in checkout. No real charge is made with test keys.

The webhook handles PaymentIntent success, failure, and cancellation events. A local Stripe listener must remain running to receive forwarded events.

## Database and migrations

The repository currently contains the Prisma schema and one migration that adds a unique index for Stripe PaymentIntent IDs. It does **not** contain an initial migration that creates every application table. For a fresh local development database, use `npx prisma db push` as shown above.

Do not treat `npx prisma migrate deploy` as fresh-database setup for this repository state. Before deploying schema changes through production migrations, create and review a complete migration baseline. Back up existing local data before applying schema changes with `db push`.

## Checks

There is no automated test script configured yet. The available checks are:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

## Security notes

- Never commit `.env` or paste real service keys into source control. `.env.example` contains placeholders only.
- Use Stripe test keys for local payment testing.
- The seed account is for local development. Do not run the seed as a production account-provisioning mechanism.
- PDF downloads are authorized through the app, while existing Cloudinary assets may still be directly accessible if their URLs were previously shared.
