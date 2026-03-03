# Frontend Architecture

## Overview

The frontend is a **Next.js 15** application (App Router) that serves as the UI layer for the Finance Tracker platform. It communicates exclusively with the NestJS backend through a **BFF (Backend For Frontend) proxy layer** — browser clients never call the backend directly.

```
Browser
  │
  ▼
Next.js Frontend (port 3001)
  │  app/api/**  ← Next.js Route Handlers (BFF proxy)
  │
  ▼
NestJS Backend (port 3000)
```

---

## Technology Stack

| Concern | Library / Version |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI Components | MUI v7 (`@mui/material`, `@mui/icons-material`, `@mui/x-data-grid`, `@mui/x-date-pickers`) |
| Server-State / Caching | TanStack React Query v5 |
| Client-State | Zustand |
| Forms | React Hook Form + Zod |
| Date Utilities | date-fns |
| Styling | Emotion (CSS-in-JS, via MUI) |
| Testing | Jest + React Testing Library |
| Language | TypeScript |

---

## Directory Structure

```
frontend/
├── app/                        # Next.js App Router root
│   ├── layout.tsx              # Root HTML shell + global providers
│   ├── page.tsx                # Root redirect → /transactions
│   ├── providers.tsx           # Client-side provider tree
│   ├── types.ts                # Shared TypeScript domain types
│   │
│   ├── api/                    # BFF proxy – Next.js Route Handlers
│   │   ├── auth/
│   │   │   ├── login/route.ts       # POST /api/auth/login
│   │   │   ├── logout/route.ts      # POST /api/auth/logout
│   │   │   ├── profile/route.ts     # GET  /api/auth/profile
│   │   │   └── register/route.ts    # POST /api/auth/register
│   │   ├── budgets/
│   │   │   ├── [id]/route.ts        # GET/PUT/DELETE /api/budgets/:id
│   │   │   ├── [id]/status/route.ts # GET /api/budgets/:id/status
│   │   │   └── route.ts             # GET/POST /api/budgets
│   │   ├── categories/
│   │   │   └── route.ts             # GET/POST /api/categories
│   │   └── transactions/
│   │       ├── [id]/route.ts        # GET/PUT/DELETE /api/transactions/:id
│   │       ├── summary/route.ts     # GET /api/transactions/summary
│   │       └── route.ts             # GET/POST /api/transactions
│   │
│   ├── auth/                   # Authentication pages (public routes)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── budgets/                # Budget management feature
│   │   ├── layout.tsx          # Wraps page in PageLayout (sidebar)
│   │   └── page.tsx            # Full CRUD + budget status cards
│   │
│   ├── statistics/             # Analytics / summary feature
│   │   ├── layout.tsx
│   │   └── page.tsx            # Income vs expense summary with date presets
│   │
│   ├── transactions/           # Transaction management feature
│   │   ├── layout.tsx          # Wraps page in PageLayout (sidebar)
│   │   ├── page.tsx            # Paginated table with filters + detail drawer
│   │   ├── new/page.tsx        # Create transaction form
│   │   ├── [id]/edit/page.tsx  # Edit transaction form
│   │   └── _components/
│   │       └── TransactionForm.tsx  # Shared create/edit form component
│   │
│   ├── components/             # Shared UI components
│   │   ├── NavBar.tsx               # Sidebar navigation (desktop + mobile drawer)
│   │   ├── PageLayout.tsx           # Shell: sidebar + main content area
│   │   └── TransactionDetailDrawer.tsx  # Slide-in transaction detail panel
│   │
│   └── hooks/                  # Data access and state hooks
│       ├── useAuth.ts               # Auth queries & mutations
│       ├── useBudgets.ts            # Budget queries & mutations
│       ├── useCategories.ts         # Category queries & mutations
│       ├── useTransactions.ts       # Transaction queries & mutations
│       └── useTransactionStore.ts   # Zustand store for filter/pagination state
│
├── lib/                        # Shared utilities (framework-agnostic)
│   ├── api.ts                  # Typed client for all /api/* proxy endpoints
│   └── proxy.ts                # Server-side helper to forward requests to NestJS
│
├── __tests__/                  # Integration / unit tests
│   ├── NavBar.test.tsx
│   └── transaction-schema.test.ts
│
├── public/                     # Static assets
├── .env.example                # Environment variable documentation
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest configuration
└── Dockerfile                  # Container image definition
```

---

## Application Layers

### 1. Provider Layer (`app/providers.tsx`)

All client-side global providers are composed in a single `<Providers>` component that is mounted inside the root layout. This keeps `app/layout.tsx` as a Server Component while isolating all `'use client'` code.

Providers included:
- **`QueryClientProvider`** — TanStack React Query instance with per-request `QueryClient`.
- **`ThemeProvider`** — MUI custom theme (black/gold palette, Inter font, rounded buttons).
- **`CssBaseline`** — MUI CSS normalizer.
- **`LocalizationProvider`** — MUI date pickers with `date-fns` adapter.

### 2. BFF Proxy Layer (`app/api/` + `lib/proxy.ts`)

Next.js Route Handlers act as a thin server-side proxy between the browser and the NestJS backend. This pattern provides:

- **Cookie-based auth security** — The JWT (`auth_token`) is stored in an `httpOnly` cookie, invisible to JavaScript. The proxy reads it server-side and injects the `Authorization: Bearer <token>` header before forwarding the request.
- **CORS isolation** — The browser never makes cross-origin requests; all traffic goes to the same Next.js origin.
- **Environment abstraction** — The backend URL (`API_BASE_URL`) is a server-only environment variable.

**`lib/proxy.ts` — `proxyToBackend()`**

A generic helper used by all Route Handlers (except auth login/logout which need custom cookie logic). It:
1. Reads `auth_token` from the request's cookie store.
2. Forwards all query parameters.
3. Passes the request body for non-GET methods.
4. Returns a `NextResponse` with the backend's status and JSON body.

**Auth routes are handled individually** (`app/api/auth/login/route.ts`, etc.) because login must set the `httpOnly` cookie and logout must clear it — operations that require custom `NextResponse` cookie manipulation.

### 3. API Client Layer (`lib/api.ts`)

A typed, domain-oriented client that wraps all calls to the `/api` proxy. Browser components call this layer; there are no raw `fetch` calls in UI code.

**Namespaced API objects:**

| Export | Methods |
|---|---|
| `transactionsApi` | `getAll(filters)`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `getSummary(start, end)` |
| `categoriesApi` | `getAll()`, `create(name)` |
| `budgetsApi` | `getAll()`, `create(data)`, `update(id, data)`, `delete(id)`, `getStatus(id)` |
| `authApi` | `login(dto)`, `register(dto)`, `logout()`, `getProfile()` |

A shared `request<T>()` helper handles:
- Attaching `Content-Type: application/json`.
- Sending credentials (cookies) with every request.
- Throwing structured errors `{ statusCode, message }` on non-2xx responses.
- Returning `undefined` for `204 No Content`.

### 4. Data Hooks Layer (`app/hooks/`)

React Query hooks wrap the API client and provide server-state management (caching, background refetching, optimistic updates). Each domain module exports both query hooks and mutation hooks.

#### `useAuth.ts`

| Hook | Purpose |
|---|---|
| `useCurrentUser()` | Fetches the authenticated user profile. Does not retry on 401. Cached for 5 minutes. |
| `useLogin()` | Submits credentials; on success invalidates the profile cache and navigates to `/transactions`. |
| `useRegister()` | Creates account; same post-success behaviour as login. |
| `useLogout()` | Calls logout endpoint, clears the entire query cache, navigates to `/auth/login`. |

#### `useTransactions.ts`

| Hook | Purpose |
|---|---|
| `useTransactions(filters)` | Paginated, filtered, sorted list. Uses `keepPreviousData` to prevent flicker during page changes. Stale after 30 s. |
| `useTransaction(id)` | Fetches a single transaction by ID. |
| `useTransactionSummary(start, end)` | Income/expense totals for a date range. Stale after 60 s. |
| `useCreateTransaction()` | Creates a transaction; invalidates all transaction queries on success. |
| `useUpdateTransaction()` | Updates a transaction; invalidates list queries and updates the detail cache entry directly. |
| `useDeleteTransaction()` | Deletes a transaction; invalidates all transaction queries. |

Query key factory (`transactionKeys`) ensures consistent, hierarchical cache keys, so a single `invalidateQueries({ queryKey: transactionKeys.all })` call sweeps lists, details, and summaries at once.

#### `useBudgets.ts`

| Hook | Purpose |
|---|---|
| `useBudgets()` | All budgets for the current user. |
| `useBudgetStatus(id)` | Enriched budget with `spent`, `remaining`, `percentageUsed`, and income contribution data. Stale after 30 s. |
| `useCreateBudget()` / `useUpdateBudget()` / `useDeleteBudget()` | Mutations that invalidate the budgets list on success. |

#### `useCategories.ts`

| Hook | Purpose |
|---|---|
| `useCategories()` | All categories. Stale after 5 minutes (categories change infrequently). |
| `useCreateCategory()` | Adds a new category; invalidates the categories cache. |

#### `useTransactionStore.ts` (Zustand)

Manages **client-only UI state** for the transactions filter panel. Separate from React Query because this state is ephemeral (not server-derived) and needs to be shared between the table, filter controls, and pagination without prop-drilling.

```
State shape:
  filters: {
    startDate, endDate,   // Date range
    searchTerm,           // Free-text search
    category,             // Category ID filter
    type,                 // 'income' | 'expense' | 'all'
    page, limit,          // Pagination
    sortBy, sortOrder,    // Sorting
  }

Actions: setFilter, setDateRange, setPage, resetFilters
```

Whenever any filter other than `page` changes, `page` is automatically reset to `1`.

---

## Pages & Features

### `/auth/login` and `/auth/register`

Public pages (no sidebar). Forms built with React Hook Form. Call `useLogin()` and `useRegister()` mutations respectively. On success the user is redirected to `/transactions`.

### `/transactions`

The main feature page.

- **Data grid** (`MUI DataGrid`) displays paginated transactions with server-side sorting.
- **Filter bar** — full-text search, type toggle (`income`/`expense`/`all`), category autocomplete, date range pickers. All filter state lives in `useTransactionStore`.
- **`TransactionDetailDrawer`** — clicking a row opens a MUI `Drawer` showing the full transaction details with edit/delete actions.
- **Navigation** to `/transactions/new` and `/transactions/[id]/edit`.

### `/transactions/new` and `/transactions/[id]/edit`

Both use the shared `TransactionForm` component which:
- Validates with Zod (`amount`, `categoryId`, `date`, `type`, `description`).
- Allows inline creation of a new category via `useCreateCategory()`.
- Calls `useCreateTransaction()` or `useUpdateTransaction()` depending on mode.
- Redirects back to `/transactions` on success.

### `/budgets`

Full CRUD for budget management on a single page.

- Budget cards show `LinearProgress` bars for spend tracking with colour coding (green / amber / red).
- A `BudgetStatusDetail` dialog displays the full breakdown: effective budget (adjusted for income), total spent, remaining, and individual income contributions.
- Create/edit forms use React Hook Form with Zod and auto-compute `endDate` from `startDate + period`.

### `/statistics`

Summary dashboard showing:
- Total income, expenses, and net balance for the selected period.
- Per-category breakdown with percentage-of-total bars.
- **Preset toggles**: This Week, This Month (default), This Year, Custom.
- Custom range mode activates two `DatePicker` inputs.
- Powered entirely by `useTransactionSummary()`.

---

## Routing & Navigation

```
/                          → redirect to /transactions (permanent)
/auth/login                → Login page (public)
/auth/register             → Register page (public)
/transactions              → Transaction list (authenticated)
/transactions/new          → Create transaction (authenticated)
/transactions/[id]/edit    → Edit transaction (authenticated)
/budgets                   → Budget management (authenticated)
/statistics                → Statistics dashboard (authenticated)
```

Authenticated routes are wrapped in `PageLayout` (via `layout.tsx` files) which renders the `NavBar` sidebar. The `NavBar` calls `useCurrentUser()` to display the logged-in user's name and avatar, and provides a logout button.

---

## Authentication Flow

```
1. User submits login form
   → POST /api/auth/login
   → Next.js route handler forwards credentials to NestJS
   → On success: sets httpOnly cookie `auth_token` (7-day TTL)
   → Browser is redirected to /transactions

2. Every subsequent API call
   → Browser sends cookie automatically (credentials: 'include')
   → Next.js route handler reads `auth_token` from cookie store
   → Injects Authorization: Bearer <token> header
   → Forwards request to NestJS backend

3. Logout
   → POST /api/auth/logout clears the `auth_token` cookie
   → React Query cache is cleared
   → User is redirected to /auth/login
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│                  React Component                      │
│   e.g. transactions/page.tsx                         │
│                                                      │
│  useTransactionStore()  ──► filter state (Zustand)  │
│  useTransactions(filters) ──► TanStack React Query  │
└────────────────────────┬─────────────────────────────┘
                         │ calls
                         ▼
┌──────────────────────────────────────────────────────┐
│               lib/api.ts  (transactionsApi)          │
│   fetch('/api/transactions?page=1&...')              │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP (same origin)
                         ▼
┌──────────────────────────────────────────────────────┐
│     app/api/transactions/route.ts  (Route Handler)   │
│     lib/proxy.ts → proxyToBackend()                  │
│     • reads auth_token cookie                        │
│     • injects Authorization header                   │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP (server → server)
                         ▼
┌──────────────────────────────────────────────────────┐
│           NestJS Backend  :3000                      │
│           GET /transactions                          │
└──────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Where Used | Description |
|---|---|---|
| `API_BASE_URL` | Server-only (Route Handlers) | Base URL of the NestJS backend. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_NAME` | Client + Server | Display name of the application. |

---

## Testing

Tests live in `__tests__/` and run with Jest + React Testing Library.

| File | What it tests |
|---|---|
| `NavBar.test.tsx` | Renders the sidebar, active link highlighting, logout behaviour |
| `transaction-schema.test.ts` | Zod validation schemas for transaction form data |

**Scripts:**

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:cov      # With coverage report
```

---

## Docker

The `Dockerfile` builds the Next.js app for production:

1. Installs dependencies.
2. Runs `next build`.
3. Starts `next start` on port `3001`.

In the `docker-compose.yml` at the repository root, the frontend service is linked to the backend service, and `API_BASE_URL` is set to the internal Docker network address of the backend container.
