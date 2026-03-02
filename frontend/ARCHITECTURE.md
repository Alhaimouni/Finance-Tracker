# Frontend Architecture Overview

This is a **Next.js 14 App Router** application using a **proxy pattern** to talk to the NestJS backend. It uses MUI for UI, React Query for server state, and Zustand for local state.

---

## 1. Entry Point & Global Setup

### `app/layout.tsx`
The root layout — wraps **everything** in `<Providers>`. Sets the page title and applies the Inter font.

### `app/providers.tsx`
Sets up three global providers that every page inherits:

| Provider | Purpose |
|---|---|
| `QueryClientProvider` | React Query — manages all server data fetching/caching |
| `ThemeProvider` | MUI custom theme (colors, fonts) |
| `LocalizationProvider` | Makes date pickers work with `date-fns` |

---

## 2. The Proxy Pattern (The Most Important Architectural Decision)

The browser **never talks directly to the NestJS backend**. Instead:

```
Browser → Next.js API Routes (/api/...) → NestJS Backend
```

**Why?** To keep the JWT token in an `httpOnly` cookie (safe from JavaScript/XSS attacks).

### Login flow specifically:
```
1. User submits login form
2. POST /api/auth/login  (Next.js route)
3. Next.js forwards to NestJS → gets { accessToken, user }
4. Next.js stores accessToken in httpOnly cookie  ← JS can't read this
5. Returns user data to browser
```

### All other requests:
```
1. Browser calls GET /api/transactions
2. lib/proxy.ts reads the httpOnly cookie server-side
3. Adds Authorization: Bearer <token> header
4. Forwards to NestJS backend
5. Returns response to browser
```

This lives in `lib/proxy.ts` — the `proxyToBackend()` function handles all of this automatically.

---

## 3. API Routes (`app/api/`)

These are the **Next.js server-side routes** that act as the proxy layer:

```
app/api/
├── auth/login/route.ts           → special: sets httpOnly cookie on login
├── auth/logout/route.ts          → clears the cookie
├── auth/profile/route.ts         → proxies to NestJS /auth/profile
├── auth/register/route.ts        → proxies to NestJS /auth/register
├── transactions/route.ts         → GET (list) / POST (create)
├── transactions/[id]/route.ts    → GET / PUT / DELETE single transaction
├── transactions/summary/route.ts → GET summary stats
├── categories/route.ts           → GET / POST
└── budgets/route.ts + [id]/status → GET / POST / status
```

Each one is thin — most just call `proxyToBackend(req, '/path')`.

---

## 4. Client-Side API Layer (`lib/api.ts`)

A clean typed API client that the React components use. It calls `/api/...` (the Next.js proxy routes), not the backend directly:

```typescript
// Example - browser calls Next.js proxy, not NestJS
transactionsApi.getAll(filters)   // GET /api/transactions?...
transactionsApi.create(data)      // POST /api/transactions
categoriesApi.getAll()            // GET /api/categories
authApi.login(dto)                // POST /api/auth/login
```

It uses `credentials: 'include'` so the cookie is always sent automatically.

---

## 5. Hooks (`app/hooks/`)

Hooks wrap `lib/api.ts` with **React Query**, providing caching, loading states, and auto-refetching:

### `useAuth.ts`

| Hook | What it does |
|---|---|
| `useCurrentUser()` | Fetches logged-in user, cached 5 min |
| `useLogin()` | Mutation → on success redirects to `/transactions` |
| `useRegister()` | Mutation → same redirect |
| `useLogout()` | Mutation → clears all cache → redirects to `/auth/login` |

### `useTransactions.ts`

| Hook | What it does |
|---|---|
| `useTransactions(filters)` | Paginated/filtered list, keeps previous data while loading |
| `useTransaction(id)` | Single transaction by ID |
| `useTransactionSummary()` | Income/expense totals |
| `useCreateTransaction()` | Mutation → invalidates all transaction queries on success |
| `useUpdateTransaction()` | Mutation → also updates the detail cache |
| `useDeleteTransaction()` | Mutation → invalidates list |

### `useTransactionStore.ts`
A **Zustand store** for local UI state (e.g., which transaction is selected in the drawer) — not server data, just UI state.

---

## 6. Pages & Routing

```
/                       → app/page.tsx (home/redirect)
/auth/login             → login form (uses useLogin hook)
/auth/register          → register form (uses useRegister hook)
/transactions           → transactions list with DataGrid, filters, search
/transactions/new       → create new transaction form
/transactions/[id]/edit → edit existing transaction
/budgets                → budgets list with status
```

---

## 7. Types (`app/types.ts`)

Single source of truth for all TypeScript types shared across the app: `Transaction`, `Category`, `Budget`, `BudgetStatus`, `User`, `AuthTokens`, `TransactionFormData`, etc.

---

## Full Request Flow (Example: Loading Transactions Page)

```
1. User visits /transactions
2. transactions/page.tsx renders
3. useTransactions(filters) hook fires
4. React Query calls transactionsApi.getAll(filters)
5. lib/api.ts sends GET /api/transactions?... with credentials: include
6. Next.js API route (app/api/transactions/route.ts) receives it
7. lib/proxy.ts reads httpOnly cookie, adds Authorization header
8. Forwards to NestJS backend http://localhost:3000/transactions
9. NestJS validates JWT, queries DB, returns paginated data
10. Data flows back → React Query caches it → DataGrid renders
```
