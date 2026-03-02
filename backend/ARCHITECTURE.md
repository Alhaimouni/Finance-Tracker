# Backend Architecture — Finance Tracker

## Overview

The backend is a **NestJS** REST API written in TypeScript, backed by a **PostgreSQL** database accessed through **TypeORM**. Authentication is handled with **JWT** (via Passport). The application uses NestJS's module system to separate concerns into cohesive, self-contained feature modules.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | TypeORM |
| Auth | JWT + Passport (`passport-jwt`) |
| Validation | `class-validator` / `class-transformer` |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Events | `@nestjs/event-emitter` |
| Config | `@nestjs/config` (`.env` file) |

---

## Entry Point — `main.ts`

The bootstrap function wires together all cross-cutting concerns before the server starts listening:

- **CORS** — allows requests from `localhost:3000` and `localhost:3001` (Next.js frontend)
- **Global `ValidationPipe`** — enforces DTO validation (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
- **Global Exception Filters** — two-layer filter chain: `AllExceptionsFilter` (catches everything) and `HttpExceptionFilter` (formats HTTP errors)
- **Swagger UI** — generated at `/api` using `DocumentBuilder`; Bearer auth scheme (`access-token`) is registered

---

## Module Hierarchy

```
AppModule  (root)
├── ConfigModule         (global — exposes environment variables)
├── TypeOrmModule        (global DB connection — PostgreSQL)
├── EventEmitterModule   (global in-process event bus)
├── UsersModule
├── AuthModule           (depends on UsersModule)
├── CategoriesModule
├── TransactionsModule
├── BudgetsModule        (depends on TransactionsModule)
└── EventsModule         (depends on BudgetsModule)
```

---

## Modules

### 1. `UsersModule`

**Purpose:** Manages the `User` entity and exposes `UsersService` to other modules.

| File | Responsibility |
|---|---|
| `user.entity.ts` | TypeORM entity — `users` table (`id`, `email`, `passwordHash`, `name`, `createdAt`) |
| `users.service.ts` | `create()`, `findByEmail()`, `findById()` |
| `users.module.ts` | Exports `UsersService` |

**Database Table: `users`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | auto-generated |
| `email` | varchar | unique |
| `passwordHash` | varchar | bcrypt hash |
| `name` | varchar | |
| `createdAt` | timestamp | auto |

---

### 2. `AuthModule`

**Purpose:** Handles user registration, login, and JWT issuance/validation.

| File | Responsibility |
|---|---|
| `auth.controller.ts` | Exposes `POST /auth/register`, `POST /auth/login`, `GET /auth/profile` |
| `auth.service.ts` | `register()` — creates user + returns token; `login()` — validates password with bcrypt + returns token |
| `jwt.strategy.ts` | Passport strategy — extracts JWT from `Authorization: Bearer` header, validates against DB |
| `dto/register.dto.ts` | `{ email, password, name }` |
| `dto/login.dto.ts` | `{ email, password }` |
| `auth.module.ts` | Imports `UsersModule`, `PassportModule`, `JwtModule` (async config) |

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account, receive `accessToken` |
| POST | `/auth/login` | Public | Login, receive `accessToken` |
| GET | `/auth/profile` | Bearer JWT | Return current user payload |

**Token Payload:**
```json
{ "sub": "<userId>", "email": "user@example.com", "name": "Alice" }
```

---

### 3. `CategoriesModule`

**Purpose:** User-scoped categories used to classify transactions and budgets.

| File | Responsibility |
|---|---|
| `category.entity.ts` | TypeORM entity — `categories` table |
| `categories.service.ts` | `create()`, `findAll()` |
| `categories.controller.ts` | Exposes `POST /categories`, `GET /categories` |
| `dto/create-category.dto.ts` | `{ name }` |

**Database Table: `categories`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | varchar | |
| `userId` | UUID (FK → users) | scoped per user |
| `createdAt` | timestamp | |

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/categories` | Bearer JWT | Create a category |
| GET | `/categories` | Bearer JWT | List all categories for the current user |

---

### 4. `TransactionsModule`

**Purpose:** Core financial record — income and expense entries with filtering, pagination, and summary analytics.

| File | Responsibility |
|---|---|
| `transaction.entity.ts` | TypeORM entity — `transactions` table |
| `transactions.service.ts` | Full CRUD + `findAll()` with query builder, `getSummary()` |
| `transactions.controller.ts` | Exposes 5 REST endpoints |
| `dto/create-transaction.dto.ts` | `{ amount, categoryId, date, type, description? }` |
| `dto/update-transaction.dto.ts` | Partial of create DTO |
| `dto/query-transaction.dto.ts` | `{ page, limit, sortBy, sortOrder, startDate, endDate, category, type, search }` |

**Database Table: `transactions`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `amount` | decimal(12,2) | |
| `categoryId` | UUID (FK → categories) | eager-loaded |
| `date` | date | |
| `type` | enum | `'income'` \| `'expense'` |
| `description` | text | nullable |
| `userId` | UUID (FK → users) | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/transactions` | Bearer JWT | Create transaction; emits `transaction.created` |
| GET | `/transactions` | Bearer JWT | Paginated list with filters & sorting |
| GET | `/transactions/summary` | Bearer JWT | Income/expense totals and breakdown by category |
| GET | `/transactions/:id` | Bearer JWT | Single transaction |
| PUT | `/transactions/:id` | Bearer JWT | Update transaction; emits `transaction.updated` |
| DELETE | `/transactions/:id` | Bearer JWT | Delete transaction (204) |

**`getSummary()` Response Shape:**
```json
{
  "totalIncome": 3000,
  "totalExpense": 1200,
  "netBalance": 1800,
  "byCategory": [
    { "category": "Groceries", "total": 500, "count": 4 }
  ]
}
```

---

### 5. `BudgetsModule`

**Purpose:** Spending limits per category for a defined date range, with live status reporting.

| File | Responsibility |
|---|---|
| `budget.entity.ts` | TypeORM entity — `budgets` table |
| `budgets.service.ts` | CRUD + `getStatus()` — calculates spent/remaining/percentageUsed |
| `budgets.controller.ts` | Exposes 5 REST endpoints |
| `dto/create-budget.dto.ts` | `{ categoryId, amount, period, startDate, endDate }` |
| `dto/update-budget.dto.ts` | Partial of create DTO |

**Database Table: `budgets`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `categoryId` | UUID (FK → categories) | eager-loaded |
| `amount` | decimal(12,2) | budget limit |
| `period` | enum | `'weekly'` \| `'monthly'` \| `'yearly'` |
| `startDate` | date | |
| `endDate` | date | |
| `userId` | UUID (FK → users) | |
| `createdAt` | timestamp | |

`BudgetsService` depends on `TransactionsService` to compute how much has been spent within the budget window.

**Endpoints:**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/budgets` | Bearer JWT | Create a budget |
| GET | `/budgets` | Bearer JWT | List all budgets |
| GET | `/budgets/:id/status` | Bearer JWT | Budget vs. actual spending |
| PUT | `/budgets/:id` | Bearer JWT | Update a budget |
| DELETE | `/budgets/:id` | Bearer JWT | Delete a budget (204) |

---

### 6. `EventsModule`

**Purpose:** Reacts to transaction lifecycle events and logs budget warnings.

| File | Responsibility |
|---|---|
| `transaction-events.listener.ts` | Handles `transaction.created` and `transaction.updated` events |
| `events.module.ts` | Registers `TransactionEventsListener`, imports `BudgetsModule` |

**Event Flow:**

```
TransactionsService.create() / update()
        │
        │ eventEmitter.emit('transaction.created' | 'transaction.updated', tx)
        ▼
TransactionEventsListener
        │
        ├── Fetches all budgets for the user
        ├── Finds budgets matching the transaction's category and date range
        └── Calls BudgetsService.getStatus()
             ├── ≥ 80%  → logs BUDGET WARNING
             └── ≥ 100% → logs BUDGET EXCEEDED
```

> Currently budget alerts are logged to the console. This listener is the integration point for future notifications (email, push, etc.).

---

## Common (Shared) Layer

Located at `src/common/`, these utilities are consumed across all feature modules.

### Guards — `guards/jwt-auth.guard.ts`

`JwtAuthGuard` extends `AuthGuard('jwt')`. It checks the `@Public()` metadata on the route before delegating to Passport — public routes bypass authentication entirely.

### Decorators — `decorators/`

| Decorator | Usage |
|---|---|
| `@CurrentUser()` | Parameter decorator — injects the `JwtPayload` (`{ sub, email, name }`) from the request |
| `@Public()` | Method/class decorator — marks a route as unauthenticated (sets `IS_PUBLIC_KEY` metadata) |

### Filters — `filters/`

| Filter | Catches | Behavior |
|---|---|---|
| `HttpExceptionFilter` | `HttpException` | Returns structured JSON with `statusCode`, `timestamp`, `path` |
| `AllExceptionsFilter` | Everything | Fallback for unexpected errors |

Applied globally in `main.ts` as a two-layer chain (specific first, generic second).

### Pipes — `pipes/parse-uuid.pipe.ts`

`ParseUuidPipe` validates that a route param is a valid UUID v4 before it reaches the controller. Returns `400 Bad Request` on failure.

---

## Data Relationships

```
User
 ├── has many Categories
 ├── has many Transactions  (each Transaction → one Category)
 └── has many Budgets       (each Budget → one Category)
```

All foreign keys use `onDelete: 'CASCADE'` so deleting a user removes all their data. Deleting a category cascades to both transactions and budgets.

---

## Authentication Flow

```
Client
  │
  ├─ POST /auth/register  ──► AuthService.register()
  │                              └─ UsersService.create() (bcrypt hash)
  │                              └─ JwtService.sign(payload)
  │                              └─ returns { accessToken, user }
  │
  ├─ POST /auth/login  ─────► AuthService.login()
  │                              └─ UsersService.findByEmail()
  │                              └─ bcrypt.compare(password, hash)
  │                              └─ JwtService.sign(payload)
  │                              └─ returns { accessToken, user }
  │
  └─ Protected Request
       Authorization: Bearer <token>
              │
              ▼
        JwtAuthGuard.canActivate()
              │  @Public()? → allow
              │  else → Passport JwtStrategy.validate()
              │           └─ UsersService.findById(sub)
              │           └─ attaches user to request
              ▼
        Controller method receives @CurrentUser() user: JwtPayload
```

---

## Request Lifecycle

```
HTTP Request
      │
      ▼
  [NestJS Router]
      │
      ▼
  JwtAuthGuard  ←── checks @Public() or validates Bearer token
      │
      ▼
  ValidationPipe  ←── transforms & validates DTOs / query params
      │
      ▼
  Controller Method
      │
      ▼
  Service Method  ←── business logic + DB operations
      │
      ▼
  [EventEmitter]  ←── optional: emit domain events
      │
      ▼
  HTTP Response
      │
  (on error)
      ▼
  HttpExceptionFilter / AllExceptionsFilter
```

---

## Environment Variables

Defined in `.env` (see `.env.example`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry duration (e.g. `7d`) |
| `NODE_ENV` | `development` \| `production` — controls DB `synchronize` and logging |
| `PORT` | Server port (defaults to `3000`) |

---

## API Documentation

Swagger UI is available at **`http://localhost:3000/api`** when the server is running. All endpoints are grouped by tag (`auth`, `categories`, `transactions`, `budgets`) and protected routes require a Bearer token entered via the "Authorize" button.
