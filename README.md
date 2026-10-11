# 🌊 FloodSignal - Real-Time Flood Emergency Reporting & Response System

> **Community Flood Reporting & Emergency Operations Platform**  
> Empowering citizens to submit real-time flood emergency reports with telemetry validation and geospatial clustering, and providing emergency responders with prioritized dispatch triage.

---

## 🔑 Admin / Responder Credentials

For testing, administration, and emergency dispatch review, access the portal using the following credentials:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin / Responder** | `arsh@gmail.com` | `Arsh@123` |

> [!NOTE]
> After launching the database and backend, if this user is not yet present in your local database, you can log in directly after registering it or provision it instantly using:
> ```bash
> cd server
> node provision-responder.js arsh@gmail.com Arsh@123 "Arsh Admin"
> node promote.js arsh@gmail.com admin
> ```

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Project Architecture](#-project-architecture)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Variables](#-environment-variables)
- [Administrative CLI Tools](#-administrative-cli-tools)
- [Running Automated Verification & Tests](#-running-automated-verification--tests)
- [Production Deployment](#-production-deployment)
- [License](#-license)

---

## ✨ Features

- **🚨 Citizen Reporting:** Report flood depth, stranded status, critical hazards (electrical, sewage, structural), water flow speed, and upload evidence photos.
- **🛰️ Automated Telemetry:** Integrates real-time environmental telemetry (precipitation, elevation) based on GPS coordinates.
- **🗺️ Interactive Map:** Leaflet-powered heatmaps, severity clusters, and GPS-tagged incident markers.
- **🎯 Deterministic Priority Scoring:** Transparent severity scoring formula accounting for life hazard, water depth, vulnerability, and environmental metrics.
- **🛡️ Role-Based Access Control (RBAC):** Distinct interfaces for citizens, verified responders, and admins with HttpOnly JWT security.
- **⚡ Duplicate Detection:** Geospatial & temporal clustering to prevent redundant dispatch calls.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet
- **Backend:** Node.js, Express 5, Mongoose / MongoDB
- **Authentication:** JWT (stored in HttpOnly secure cookies) & Bcrypt password hashing
- **Storage:** Local storage driver (dev) / AWS S3 (production)

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js:** v18.0.0 or later (v20+ recommended)
- **npm:** v9.0.0 or later
- **MongoDB:** A running local MongoDB instance (`mongodb://localhost:27017/floodsignal`) or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI.

---

## 🏗️ Project Architecture

```
Flood-Signal/
├── server/                 # Express backend API & DB models
│   ├── index.js            # Main Express entry point & endpoints
│   ├── routes/             # Authentication & user routes
│   ├── models/             # Mongoose schemas (User, Report)
│   ├── lib/                # Scoring, storage, duplicate detection, telemetry
│   ├── promote.js          # CLI script to promote users to responder/admin
│   └── provision-responder.js # CLI script to create/promote responder
├── src/                    # React frontend application
│   ├── components/         # Reusable UI components & views
│   ├── context/            # AuthContext & state management
│   ├── types/              # TypeScript / JSDoc data types
│   └── main.jsx            # Frontend entry point
├── public/                 # Static assets
└── package.json            # Frontend dependencies & build scripts
```

---

## 🚀 Quick Start Guide

### 1. Clone Repository

```bash
git clone https://github.com/your-username/Flood-Signal.git
cd Flood-Signal
```

---

### 2. Backend Setup

1. Navigate to the `server/` directory and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Create your server environment file:
   ```bash
   cp .env.example .env
   ```

3. Update `server/.env` with your configuration:
   ```env
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/floodsignal
   ALLOWED_ORIGIN=http://localhost:5173
   JWT_SECRET=super_secret_jwt_passphrase_min_32_characters_long
   STORAGE_DRIVER=local
   ```

4. *(Optional)* Provision the Admin user:
   ```bash
   node provision-responder.js arsh@gmail.com Arsh@123 "Arsh Admin"
   node promote.js arsh@gmail.com admin
   ```

5. Start the backend server:
   ```bash
   npm start
   ```
   > Backend will run at `http://localhost:5001`.

---

### 3. Frontend Setup

1. Open a new terminal window in the project root:
   ```bash
   cd /path/to/Flood-Signal
   npm install
   ```

2. Create your frontend environment file:
   ```bash
   cp .env.example .env
   ```

3. Update root `.env`:
   ```env
   VITE_API_URL=http://localhost:5001/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   > Frontend will be accessible at `http://localhost:5173`.

---

## ⚙️ Environment Variables

### Backend (`server/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `5001` | Port the Express API listens on. |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string (Local or MongoDB Atlas). |
| `ALLOWED_ORIGIN` | **Yes** | `http://localhost:5173` | Allowed CORS origins (comma-separated for multiples). |
| `JWT_SECRET` | **Yes** | — | Secret key used to sign JWT auth cookies (min 32 chars). |
| `STORAGE_DRIVER` | No | `local` | Upload destination: `local` (dev) or `s3` (production). |
| `S3_BUCKET_NAME` | Prod | — | Dedicated AWS S3 bucket name if using `STORAGE_DRIVER=s3`. |
| `AWS_REGION` | Prod | `us-east-1` | AWS region hosting the S3 bucket. |

### Frontend (`.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `VITE_API_URL` | **Yes** | `http://localhost:5001/api` | Base URL pointing to the Express `/api` backend. |

---

## 🛠️ Administrative CLI Tools

The backend includes server-side CLI utilities located in `server/`:

### Provision Responder / Admin
Create a user account or elevate an existing account with credentials:
```bash
cd server
node provision-responder.js <email> <password> [name]
```
Example:
```bash
node provision-responder.js arsh@gmail.com Arsh@123 "Arsh Admin"
```

### Promote User Role
Upgrade any registered user to `responder` or `admin`:
```bash
cd server
node promote.js <email> [responder|admin]
```
Example:
```bash
node promote.js arsh@gmail.com admin
```

---

## 🧪 Running Automated Verification & Tests

The project includes test scripts in `server/` to verify backend logic:

```bash
cd server

# Test deterministic priority scoring engine
node test_scoring.js

# Test duplicate incident clustering
node test_photos_duplicates.js

# Test environmental telemetry integration
node test_telemetry.js

# Test timeline updates and status tracking
node test_timeline.js
```

---

## 🌐 Production Deployment

For deploying the frontend on **AWS Amplify Hosting** and the backend on **AWS App Runner** or **Docker**, check the complete step-by-step production instructions in [DEPLOYMENT.md](file:///Users/arsh/Desktop/Flood-Signal/DEPLOYMENT.md).

---

## 📄 License

This project is licensed under the MIT License.
