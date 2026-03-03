# Finance Tracker

A full-stack personal finance management application that helps users track income and expenses, organize transactions by category, set spending budgets, and visualize financial summaries — all behind a secure JWT-authenticated API.

---

## ✨ Features

### 🔐 Authentication
- User registration and login with bcrypt-hashed passwords
- JWT-based authentication stored in an `httpOnly` cookie (invisible to JavaScript)
- Protected routes — unauthenticated users are redirected to the login page
- Profile endpoint to retrieve the currently authenticated user

### 💸 Transactions
- Create, view, edit, and delete income/expense transactions
- Attach a category, date, amount, type (`income` | `expense`), and optional description to each entry
- Paginated transaction list with **filtering** (date range, category, type, keyword search) and **sorting**
- Slide-in detail drawer for quick transaction inspection without leaving the list view
- Dedicated create and edit forms with validation (React Hook Form + Zod)

### 📂 Categories
- User-scoped custom categories (e.g., Groceries, Rent, Salary)
- Categories are reused across transactions and budgets
- Inline category creation from transaction and budget forms

### 📊 Statistics & Summary
- Income vs. expense totals for any selected date range
- Quick date presets (This Month, Last Month, This Year, etc.)
- Spending breakdown by category with totals and transaction counts
- Net balance calculation (`totalIncome - totalExpense`)

### 💼 Budgets
- Set spending limits per category for a defined date period
- Live budget status cards showing **spent**, **remaining**, and **% used**
- Full CRUD — create, edit, and delete budgets
- Automatic recalculation when new transactions are recorded (via in-process event emitter)

### 🎨 UI / UX
- Responsive sidebar layout — collapsible drawer on mobile
- MUI v7 DataGrid for the transaction table (sorting, pagination built-in)
- Consistent black-and-gold theme with rounded components
- Full TypeScript coverage across frontend and backend

---

## 🧰 Tech Stack

### 🛠 Backend
- **Framework**: NestJS with TypeScript
- **ORM**: TypeORM (preferred) or Prisma
- **Database**: PostgreSQL (preferred) or SQL
- **Event Streaming**: Kafka (preferred)

### 💻 Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript + React 18+
- **UI Library**: MUI v7 (DataGrid, Dialogs, Forms)
- **State/Data**: React Query


## 🚀 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine

### 1. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values (database credentials, JWT secret, etc.).

### 2. Start the application

```bash
docker-compose up --build
```

This command will:
- Build the Docker images for both frontend and backend
- Start PostgreSQL, the NestJS API, and the Next.js frontend
- Make the application accessible locally

### 3. Open in your browser

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3001 |
| Backend API | http://localhost:3000 |
| Swagger / API Docs | http://localhost:3000/api |

### 4. Create your first account

Navigate to **http://localhost:3001/auth/register**, create an account, and you will be redirected to the transactions dashboard automatically.

---

## 📁 Project Structure

```
Finance-Tracker/
├── backend/          # NestJS REST API
│   └── src/
│       ├── auth/           # Registration, login, JWT strategy
│       ├── users/          # User entity and service
│       ├── transactions/   # Core financial records (CRUD + filters + summary)
│       ├── categories/     # User-scoped categories
│       ├── budgets/        # Spending limits with live status
│       ├── events/         # In-process event listeners (budget recalculation)
│       ├── common/         # Guards, decorators, filters, pipes
│       └── seeds/          # Database seed script
│
├── frontend/         # Next.js 15 App Router UI
│   └── app/
│       ├── api/            # BFF proxy — Route Handlers forwarding to the backend
│       ├── auth/           # Login and Register pages
│       ├── transactions/   # Transaction list, create, and edit pages
│       ├── budgets/        # Budget management page
│       ├── statistics/     # Income/expense summary page
│       ├── components/     # Shared UI (NavBar, PageLayout, DetailDrawer)
│       └── hooks/          # React Query data hooks (useTransactions, useBudgets, …)
│
└── docker-compose.yml  # Orchestrates PostgreSQL, backend, and frontend
```

---

## 📖 Further Reading

- [Backend Architecture](backend/ARCHITECTURE.md) — module hierarchy, entity schemas, all REST endpoints, and service design
- [Frontend Architecture](frontend/ARCHITECTURE.md) — BFF proxy pattern, API client layer, React Query hooks, and component structure
