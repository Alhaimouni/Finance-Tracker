## Plan: Full-Stack Finance Tracker Build

**TL;DR** — Build the NestJS backend and Next.js frontend in parallel, following the README spec with the clean schema (`amount`, `category`, `date`, `type`). The frontend will use Next.js API routes as a proxy layer to the backend. JWT authentication is included from the start. Backend provides Swagger docs, event-driven Kafka integration, and full CRUD for transactions, categories, and budgets. Frontend delivers a paginated DataGrid, detail drawer, create form, and robust UX states. Both tracks converge at integration time via the proxy layer.

---

### Steps

#### Phase 1 — Foundation (Backend + Frontend in parallel)

**Backend Track**

1. **Install required dependencies** in `backend/package.json`:
   - `@nestjs/typeorm`, `typeorm`, `pg` — PostgreSQL ORM
   - `@nestjs/config` — environment variables
   - `@nestjs/swagger`, `@nestjs/platform-express` — API docs
   - `class-validator`, `class-transformer` — DTO validation
   - `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` — JWT auth
   - `@nestjs/microservices`, `kafkajs` — Kafka events
   - `@nestjs/event-emitter` — internal event bus

2. **Configure `AppModule`** in `backend/src/app.module.ts`:
   - Import `ConfigModule.forRoot()` (global)
   - Import `TypeOrmModule.forRootAsync()` using `DATABASE_URL` from env
   - Import `EventEmitterModule.forRoot()`
   - Register feature modules (created in later steps)

3. **Update `main.ts`** in `backend/src/main.ts`:
   - Add `GlobalValidationPipe` with `whitelist: true, transform: true`
   - Add Swagger setup (`DocumentBuilder`, `SwaggerModule`)
   - Enable CORS for `http://localhost:3001`
   - Connect Kafka microservice transport

4. **Create global error handling**:
   - `src/common/filters/http-exception.filter.ts` — catch all HTTP exceptions, return consistent JSON shape
   - `src/common/filters/all-exceptions.filter.ts` — catch unhandled errors
   - Register as global filter in `main.ts`

5. **Create custom decorators & guards**:
   - `src/common/decorators/current-user.decorator.ts` — extract user from JWT payload
   - `src/common/guards/jwt-auth.guard.ts` — route protection
   - `src/common/pipes/parse-uuid.pipe.ts` — validate UUID params

**Frontend Track (parallel)**

6. **Align the data model** — update `frontend/app/types.ts`:
   - Replace current `Transaction` interface with README schema: `id`, `amount`, `category`, `date`, `type` (`income` | `expense`), plus optional `description`
   - Update `TransactionFormData` and `TransactionFilters` accordingly
   - Add `Category` interface (`id`, `name`)
   - Add `Budget` interface (`id`, `categoryId`, `amount`, `period`, `startDate`, `endDate`)
   - Add API response types (`PaginatedResponse<T>`, `AuthTokens`)

7. **Create API client** — `frontend/lib/api.ts`:
   - Base helper wrapping `fetch` to `/api/*` proxy routes
   - Include auth token header injection from cookie/localStorage
   - Typed methods: `getTransactions()`, `getTransaction(id)`, `createTransaction()`, `updateTransaction()`, `deleteTransaction()`, `getCategories()`, `createCategory()`, `login()`, `register()`

8. **Create React Query hooks** — `frontend/app/hooks/useTransactions.ts`, `useCategories.ts`, `useAuth.ts`:
   - `useTransactions(filters)` — paginated query with filter/sort params
   - `useTransaction(id)` — single item
   - `useCreateTransaction()`, `useUpdateTransaction()`, `useDeleteTransaction()` — mutations with cache invalidation
   - `useCategories()`, `useCreateCategory()`
   - `useLogin()`, `useRegister()`, `useCurrentUser()`

---

#### Phase 2 — Backend Modules

9. **Auth module** — `backend/src/auth/`:
   - `auth.module.ts` — imports `JwtModule`, `PassportModule`, `UsersModule`
   - `auth.controller.ts` — `POST /auth/register`, `POST /auth/login`, `GET /auth/profile`
   - `auth.service.ts` — hash passwords with bcrypt, issue JWT tokens
   - `jwt.strategy.ts` — validate JWT from `Authorization: Bearer` header
   - `dto/register.dto.ts`, `dto/login.dto.ts` — validated with `class-validator`

10. **Users module** — `backend/src/users/`:
    - `user.entity.ts` — `id`, `email`, `passwordHash`, `name`, `createdAt`
    - `users.service.ts` — `findByEmail()`, `create()`
    - `users.module.ts` — exports service for Auth module

11. **Categories module** — `backend/src/categories/`:
    - `category.entity.ts` — `id`, `name`, `userId`, relation to transactions
    - `dto/create-category.dto.ts` — validates `name` (string, not empty)
    - `categories.service.ts` — `create()`, `findAll(userId)`
    - `categories.controller.ts` — `POST /categories` (guarded), `GET /categories` (guarded)
    - Swagger decorators on all endpoints

12. **Transactions module** — `backend/src/transactions/`:
    - `transaction.entity.ts` — `id`, `amount` (decimal), `category` (ManyToOne → Category), `date`, `type` (enum: income|expense), `description`, `userId`, `createdAt`, `updatedAt`
    - `dto/create-transaction.dto.ts` — validate amount (positive number), category (UUID), date (ISO string), type (enum)
    - `dto/update-transaction.dto.ts` — `PartialType(CreateTransactionDto)`
    - `dto/query-transaction.dto.ts` — optional filters: `startDate`, `endDate`, `category`, `type`, `page`, `limit`, `sortBy`, `sortOrder`
    - `transactions.service.ts` — full CRUD with pagination, filtering, sorting via TypeORM QueryBuilder
    - `transactions.controller.ts` — all 5 REST endpoints, JWT-guarded, Swagger-documented
    - **Event emission**: after `create()` and `update()`, emit `transaction.created` / `transaction.updated` events via `EventEmitter2`

13. **Budgets module** — `backend/src/budgets/`:
    - `budget.entity.ts` — `id`, `categoryId` (ManyToOne → Category), `amount`, `period` (enum: monthly|weekly|yearly), `startDate`, `endDate`, `userId`
    - `dto/create-budget.dto.ts`, `dto/update-budget.dto.ts`
    - `budgets.service.ts` — `create()`, `findAll(userId)`, `findByCategory()`, `getSpendingVsBudget(budgetId)` (queries transactions within the budget's time range)
    - `budgets.controller.ts` — `POST /budgets`, `GET /budgets`, `GET /budgets/:id/status`

14. **Event listeners** — `backend/src/events/`:
    - `transaction-events.listener.ts` — listens for `transaction.created` and `transaction.updated`
      - Logs activity (console or a dedicated log entity)
      - Checks if any budget for that category is exceeded → could emit a warning event
    - **Kafka producer**: publish `transaction.created` / `transaction.updated` to Kafka topic for external consumers

15. **Summary/Report endpoint** — add to transactions controller:
    - `GET /transactions/summary?startDate=&endDate=` — returns `{ totalIncome, totalExpense, netBalance, byCategory: [...] }`

---

#### Phase 3 — Frontend UI

16. **Next.js API proxy routes** — `frontend/app/api/`:
    - `app/api/transactions/route.ts` — `GET` (list with query params) and `POST` (create) → proxy to `http://qashio-api:3000/transactions`
    - `app/api/transactions/[id]/route.ts` — `GET`, `PUT`, `DELETE` → proxy to backend
    - `app/api/transactions/summary/route.ts` — proxy summary endpoint
    - `app/api/categories/route.ts` — `GET`, `POST` → proxy
    - `app/api/budgets/route.ts` + `app/api/budgets/[id]/status/route.ts`
    - `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts` — handle token storage in httpOnly cookies
    - Each route forwards the JWT from the cookie as `Authorization: Bearer` header

17. **Update NavBar** in `frontend/app/components/NavBar.tsx`:
    - Add navigation links: Transactions, Budgets
    - Add user menu (login/logout) if auth is active
    - Add "New Transaction" button

18. **Transactions list page** — rewrite `frontend/app/transactions/page.tsx`:
    - Use `useTransactions(filters)` hook
    - Render MUI `DataGrid` with columns: date, amount, category, type, description
    - Server-side pagination (10 rows/page) via `paginationMode="server"`
    - Sortable columns via `sortingMode="server"`
    - Filter bar above grid: date range picker (MUI `DatePicker`), search input, category dropdown, type toggle (income/expense/all)
    - Wire filters to Zustand store (`useTransactionStore`) → React Query refetches on filter change
    - Loading: show `DataGrid` skeleton/loading overlay
    - Error: MUI `Alert` component
    - Empty: "No transactions found" with illustration

19. **Transaction detail drawer** — `frontend/app/components/TransactionDetailDrawer.tsx`:
    - MUI `Drawer` (anchor right) or `Dialog`
    - Triggered by row click in DataGrid
    - Fetch single transaction with `useTransaction(id)`
    - Display all fields in a clean layout
    - Edit and Delete action buttons

20. **Create transaction page** — `frontend/app/transactions/new/page.tsx`:
    - MUI form with controlled inputs:
      - `amount` — number field
      - `category` — `Autocomplete` dropdown fetched from `useCategories()`
      - `date` — MUI `DatePicker`
      - `type` — radio group or toggle (income / expense)
      - `description` — text field
    - Install `zod` + `@hookform/resolvers` for form validation (or use Yup)
    - Submit via `useCreateTransaction()` mutation
    - Success → redirect to `/transactions` with toast
    - Error → inline field errors + MUI Alert

21. **Budgets page** — `frontend/app/budgets/page.tsx` (new route):
    - List budgets with progress bars (spending vs. budget amount)
    - Create budget form (category, amount, period)

22. **Auth pages** — `frontend/app/auth/login/page.tsx` and `frontend/app/auth/register/page.tsx`:
    - Simple MUI forms for email + password
    - On success, store JWT (httpOnly cookie via API route), redirect to `/transactions`
    - Protected route middleware or layout wrapper that redirects unauthenticated users

---

#### Phase 4 — Integration & Polish

23. **Docker Compose fixes** — update `docker-compose.yml`:
    - Fix Kafka image vs env var mismatch (Bitnami image uses `KAFKA_CFG_*`, Confluent uses `KAFKA_*` — pick one consistently)
    - Add `NEXT_PUBLIC_API_URL` env var to frontend service if needed
    - Add `API_BASE_URL=http://qashio-api:3000` env var to frontend for server-side proxy calls
    - Ensure backend `depends_on` has healthcheck conditions for postgres & kafka

24. **Seed data** — `backend/src/seeds/`:
    - Create a seed script or migration that inserts default categories (Food, Transport, Salary, Entertainment, etc.) and sample transactions
    - Run on first startup or via `npm run seed`

25. **Update frontend Dockerfile** — `frontend/Dockerfile`:
    - Pass `API_BASE_URL` as build-time arg if needed for server components
    - Ensure `data/` directory is not needed in production (remove lowdb dependency)

26. **Remove lowdb layer** — delete `frontend/lib/db.ts` and `frontend/data/db.json` once backend API is fully connected

---

#### Phase 5 — Testing & Bonus

27. **Backend unit tests**:
    - `transactions.service.spec.ts` — mock TypeORM repository, test CRUD + filtering logic
    - `transactions.controller.spec.ts` — mock service, test endpoint responses
    - `categories.service.spec.ts`, `auth.service.spec.ts`
    - `budgets.service.spec.ts` — verify spending calculation

28. **Frontend unit tests**:
    - Test DataGrid rendering with mock data
    - Test form validation (Zod schemas)
    - Test React Query hooks with `QueryClientProvider` wrapper
    - Test filter store (Zustand)

29. **E2E smoke test** — update `backend/test/app.e2e-spec.ts`:
    - Test full transaction lifecycle: create category → create transaction → list → update → delete

---

### Verification

- `docker compose up --build` — all services start cleanly
- Backend: `http://localhost:3000/api` → Swagger UI loads with all endpoints documented
- Frontend: `http://localhost:3001/transactions` → DataGrid renders with paginated data
- Create a transaction via the form → appears in the list
- Click a row → detail drawer opens
- Filter by date/category/type → grid updates
- Kafka: check container logs for `transaction.created` events
- `cd backend && npm test` — unit tests pass
- `cd frontend && npm test` — component tests pass

### Decisions
- **Schema**: README spec (`amount`, `category`, `date`, `type`) — replaces current `reference`/`counterparty`/`status`/`narration` fields
- **Proxy**: Next.js API routes forward to NestJS — keeps backend URL private, simplifies CORS, enables httpOnly cookie auth
- **Auth**: JWT included from start — `register`/`login` endpoints, guards on all resource routes
- **Build order**: Parallel — backend modules and frontend UI built simultaneously, integrated via proxy routes in Phase 3–4
- **Kafka**: Used for external event streaming; `@nestjs/event-emitter` handles internal events (budget checks, logging)
