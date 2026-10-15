# <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-compass"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg> TRIPMATE

> **TripMate is a production-ready, full-stack group travel workspace designed for modern travel squads.** It combines an interactive **React 19** frontend styled with **Tailwind CSS v4** and a modular **MVC Express 5 REST API**. Real-time collaboration is powered by **Socket.io with Redis Pub/Sub scaling**, persistent storage is managed through **Neon Serverless PostgreSQL (with TIMESTAMPTZ support)**, and performance is optimized using **Redis in-memory caching and live squad presence tracking**—all verified via an automated **GitHub Actions CI/CD pipeline**.

---

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Node.js-v22-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-v5.2-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-Alpine-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Socket.io-v4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
</p>

---

## 🔗 Project Links

- 🌐 **Live Application**: 

---

## 🏗️ System Architecture

TripMate employs a decoupled client-server architecture with an in-memory caching tier, a real-time event pipeline, and a managed relational database:

```mermaid
flowchart TD
    subgraph ClientLayer["🖥️ Frontend Client (React 19 + Vite 8)"]
        UI["Modern UI / Responsive Dashboard"]
        ThemeEng["Dual-Theme Engine (Light / Obsidian Midnight)"]
        SocketClient["Socket.io Client (Real-time events)"]
        APIClient["API Service Layer (Fetch / REST)"]
    end

    subgraph CDNLayer["🌐 Edge & Delivery"]
        Vercel["Vercel Global Edge Network (CDN)"]
    end

    subgraph BackendLayer["⚙️ Backend Server (Express 5 + Node.js 22)"]
        Routes["Modular MVC Routes & Controllers"]
        SocketServer["Socket.io WebSocket Server"]
        AuthModule["Identity & Session Management"]
    end

    subgraph CacheLayer["⚡ In-Memory Cache & Presence (Redis)"]
        RedisCache["Query Cache (TTL Invalidation)"]
        RedisPresence["Ephemeral Squad Presence (SETEX)"]
        RedisAdapter["Socket.io Redis Pub/Sub Adapter"]
    end

    subgraph DBLayer["🗄️ Relational Database (Neon PostgreSQL)"]
        NeonDB[("Serverless PostgreSQL\nTIMESTAMPTZ • ACID Transactions")]
    end

    ClientLayer -->|Static Assets| Vercel
    APIClient -->|HTTP / REST JSON| Routes
    SocketClient <==>|Bi-directional WebSockets| SocketServer
    SocketServer <--> RedisAdapter
    Routes <-->|Read / Invalidate Cache| RedisCache
    SocketServer <-->|Track Online Members| RedisPresence
    Routes <-->|SQL Connection Pool (pg.Pool)| NeonDB
```

---

## ✨ Features

TripMate delivers a complete, unified workspace for coordinating group travel from ideation to expense settlement.

### 🌐 Frontend Features

Built with **React 19** and **Tailwind CSS v4** for high responsiveness, fluid animations, and accessibility:

- **Interactive Trip Workspace Dashboard:**
  - **Comprehensive Multi-Trip Management:** Browse active and upcoming trips, search by destination or invite code, and view live member counts.
  - **Quick Invitation Engine:** Copy unique 6-character trip codes or click for **1-click WhatsApp squad invite generation**.
  - **Inspirational Getaways Explorer:** Curated destination recommendations across India (Goa, Manali, Jaipur, Munnar).

- **Real-Time Group Discussion Wall:**
  - **Instant WebSocket Messaging:** Send and receive group messages without refreshing, backed by auto-reconnect fallback.
  - **Contextual Categorization Tags:** Tag messages as `💡 Idea`, `📍 Spot Reco`, `🚨 Urgent`, or `💬 General`.
  - **Live Typing Indicators:** Real-time animated typing bubbles broadcasted via WebSockets across squad members.
  - **Live Squad Presence:** Active member pill showing exactly who is online in the workspace in real-time.
  - **Accurate Browser Timezone Conversion:** Dynamic timestamp parsing guaranteeing local time representation (e.g. `04:06 pm` IST) regardless of server location.

- **Interactive Visual Itinerary Planner:**
  - **Chronological Timeline View:** Visual day-by-day activity path with milestone node connectors and status tags.
  - **Rich Activity Metadata:** Configurable time slots, activity duration, cost estimates (in ₹), location tags, and assigned companions.
  - **Expandable Activity Details:** Inline toggleable notes for reservation codes, packing hints, and booking IDs.

- **Fair Expense Splitter & Settlement ("Who Owes Who"):**
  - **Multi-Member Bill Splitting:** Split shared dinners, cabs, or hotel stays evenly or across specific subsets of companions.
  - **Pairwise Debt Simplification:** Proprietary greedy balance calculation resolving complex group debts into the minimum number of direct transactions.
  - **One-Click Settle Up:** Instantly record repayments between debtors and creditors in the PostgreSQL ledger.
  - **Bill Receipt Uploads:** Direct client-side image attachment and preview modal for physical bills and receipts.

- **Geo-Spatial Maps & Spot Explorer:**
  - **Categorized Spot Pinning:** Organize destinations by `🏖️ Beach`, `☕ Food & Cafe`, `🏨 Stay`, `🚗 Route Stop`, and `🏛️ Sightseeing`.
  - **Check-in & Visited Tracker:** Toggle visited status with strike-through progress tracking.
  - **One-Click Google Maps Navigation:** Generates direct point-to-point driving directions with encoded coordinates.

- **Budget Health & Group Analytics:**
  - **Visual Spending Breakdown:** Progress meters with dynamic color warnings (`Normal`, `75% Warning`, `Over Budget Alert`).
  - **Category Spending Distribution:** Real-time breakdown of trip expenses across Dining, Accommodation, Transit, Activities, and Shopping.
  - **Per-Person Financial Metrics:** Average spend per companion and member expenditure breakdown.

- **Vibrant Dual-Theme Engine:**
  - **Breezy Pearl Light Mode:** Fresh sky-blue canvas with high-contrast slate typography.
  - **Obsidian Midnight Dark Mode:** Deep royal sapphire surfaces (`#070A13` / `#0D1426`) with crisp borders and glowing neon badges.

---

### 🛠️ Backend Features

Built with a modular **MVC (Model-View-Controller)** pattern on **Express 5** and **Node.js 22**:

- **Modular RESTful Architecture:**
  - Separation of concerns between routing (`routes/`), request controllers (`controllers/`), database connection pools (`db.js`), and socket emitters (`sockets/`).
- **High-Performance In-Memory Caching (Redis):**
  - Caches user trip collections and workspace payloads (`user:{id}:trips`) to reduce database load.
  - Pattern-based automated cache invalidation (`delCached`, `invalidatePattern`) upon CRUD mutations.
- **Horizontal WebSocket Scaling (@socket.io/redis-adapter):**
  - Connects multiple Node.js server workers to an inter-process Redis Pub/Sub channel, ensuring chat and presence sync seamlessly across instances.
- **Relational Integrity with Neon Serverless PostgreSQL:**
  - Connection pooling using `pg.Pool` with SSL mode validation.
  - Full relational schema with cascading foreign keys (`ON DELETE CASCADE`) preventing orphaned records.
  - Stored timestamps configured with **`TIMESTAMPTZ`** ensuring timezone consistency across global servers.
- **Security & Data Sanitization:**
  - SQL injection protection through parameterized queries across all database drivers.
  - Automated credential screening via `.gitignore` with sample templates (`.env.example`).
  - Cross-Origin Resource Sharing (CORS) configured for trusted origin requests.
  - Health probe endpoint (`GET /health`) reporting system uptime, status, and server timestamps.

---

## 🗄️ Database Schema Overview

```
┌──────────────────┐       ┌──────────────────────┐       ┌────────────────────┐
│      users       │       │        trips         │       │    trip_members    │
├──────────────────┤       ├──────────────────────┤       ├────────────────────┤
│ id (PK)          │◄──┐   │ id (PK)              │◄──┐   │ id (PK)            │
│ name             │   │   │ title                │   └───│ trip_id (FK)       │
│ email (UNIQUE)   │   └───│ user_id (FK)         │       │ user_id (FK)       │
│ password         │       │ dates                │       │ role               │
│ created_at       │       │ budget               │       │ joined_at          │
└──────────────────┘       │ invite_code (UNIQUE) │       └────────────────────┘
        ▲                  │ created_at           │                  ▲
        │                  └──────────────────────┘                  │
        │                             ▲                              │
        ├─────────────────────────────┼──────────────────────────────┤
        │                             │                              │
┌───────┴──────────┐       ┌──────────┴───────────┐       ┌──────────┴─────────┐
│     expenses     │       │   itinerary_items    │       │   trip_messages    │
├──────────────────┤       ├──────────────────────┤       ├────────────────────┤
│ id (PK)          │       │ id (PK)              │       │ id (PK)            │
│ trip_id (FK)     │       │ trip_id (FK)         │       │ trip_id (FK)       │
│ title            │       │ day_number           │       │ user_id (FK)       │
│ amount           │       │ title                │       │ message            │
│ category         │       │ time                 │       │ tag                │
│ paid_by_id (FK)  │       │ location             │       │ created_at (TZ)    │
│ receipt_image    │       │ duration             │       └────────────────────┘
│ created_at       │       │ price                │
└──────────────────┘       │ icon                 │
        ▲                  │ participants         │
        │                  │ notes                │
┌───────┴──────────┐       │ created_at           │
│  expense_splits  │       └──────────────────────┘
├──────────────────┤
│ id (PK)          │
│ expense_id (FK)  │
│ user_id (FK)     │
└──────────────────┘
```

---

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites

Ensure you have the following installed:
- **Node.js**: `v20.0.0` or higher (Node v22 recommended)
- **NPM**: `v10.0.0` or higher
- **Docker**: For running a local Redis container
- **PostgreSQL Database**: Free cloud instance from [Neon.tech](https://neon.tech) or a local PostgreSQL instance

---

### Installation & Local Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/AnkitaGoyalD2004/TripMate.git
cd TripMate
```

#### 2. Start Local Redis via Docker
```bash
docker run -d -p 6379:6379 --name tripmate_redis redis:alpine
```

#### 3. Setup Backend Server
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:
```bash
cp .env.example .env
```

Configure your environment variables inside `server/.env`:
```env
PORT=5001
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
REDIS_URL=redis://localhost:6379
```

Start the backend development server:
```bash
npm run dev
```
*The backend API and WebSocket server will start on `http://localhost:5001`.*

#### 4. Setup Frontend Client
In a new terminal window:
```bash
cd client
npm install
```

Start the frontend development server:
```bash
npm run dev
```
*The frontend application will be live at `http://localhost:5173`.*

---

## 🔄 Automated CI/CD Pipeline

TripMate features an automated **GitHub Actions CI/CD pipeline** defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

Every `push` or `pull_request` to the `main` branch automatically triggers parallel verification:

1. **Frontend Job (`client-checks`)**:
   - Checks out the repository and configures Node.js 22.
   - Installs client dependencies via clean install (`npm ci`).
   - Runs ESLint rules verification (`npm run lint`).
   - Builds the production distribution (`npm run build`).
2. **Backend Job (`server-checks`)**:
   - Checks out the repository and configures Node.js 22.
   - Installs server dependencies (`npm ci`).
   - Runs syntax integrity checks on all controllers, sockets, and server files (`npm test`).
3. **Automated Continuous Deployment (CD)**:
   - Upon successful completion of all checks, **Vercel** deploys the frontend and **Render** redeploys the backend container with zero downtime.

---

## 🛠️ Tech Stack Summary

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite 8, React DOM |
| **Styling & Icons** | Tailwind CSS v4, Lucide React |
| **Backend Framework** | Node.js (v22), Express.js (v5.2) |
| **Real-Time Communication** | Socket.io (v4.8), Socket.io Client |
| **In-Memory Cache & MQ** | Redis (Alpine), ioredis, @socket.io/redis-adapter |
| **Primary Database** | PostgreSQL (Neon Cloud Serverless), node-postgres (`pg`) |
| **DevOps & CI/CD** | GitHub Actions, Docker, Vercel, Render |
| **External Integrations** | OpenStreetMap, Google Maps Directions API, WhatsApp Click-to-Chat |

---

