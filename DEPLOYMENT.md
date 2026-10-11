# FloodSignal Deployment Guide & Architecture

## 1. Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend Hosting (AWS Amplify)
        UI[React / Vite Frontend\nOverview | Report | My Reports | Profile | Response]
    end

    subgraph Backend Hosting (e.g., Render / Elastic Beanstalk)
        API[Node.js / Express API\nREST Endpoints + RBAC Middleware]
        Scoring[Deterministic Severity Scoring Engine]
    end

    subgraph Database Hosting (e.g., MongoDB Atlas)
        DB[(MongoDB Cloud Database)]
    end

    User([Citizens / Municipal Responders]) <-->|HTTPS / HttpOnly Cookie| UI
    UI <-->|REST API Calls (credentials: include)| API
    API <--> Scoring
    API <-->|Mongoose / TLS| DB
```

## 2. Explanation of AWS Integration
FloodSignal's frontend is designed for rapid, scalable deployment using **AWS Amplify Hosting**. Amplify connects directly to the GitHub repository to automatically build and host the React/Vite application globally via AWS's CDN. 

**Decoupled Microservice Architecture:** While the *frontend* static assets are hosted on AWS Amplify, the *backend* (Node.js API) and *database* (MongoDB) are configured as decoupled services. They can be deployed to separate environments (such as Render, Railway, or AWS Elastic Beanstalk for the API, and MongoDB Atlas for the database). This separation of concerns allows the backend to scale compute independently of the frontend static assets.

## 3. Environment Variables Reference

### Frontend (Build-Time / Client Environment)
| Variable | Description | Example Placeholder |
| :--- | :--- | :--- |
| `VITE_API_URL` | Public HTTPS URL of the deployed Express API root | `https://api.yourdomain.com/api` |

*Security Rule:* Never put database credentials, API keys, or JWT secrets in client-side variables (`VITE_*`).

### Backend (Server-Only Environment)
| Variable | Required | Description | Example Placeholder |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | **Yes (Mandatory)** | Cryptographically secure secret key (min. 32 chars) used to sign and verify session JWTs. Fails safely on startup if missing. | `<YOUR_SECURE_JWT_SECRET_MIN_32_CHARS>` |
| `MONGODB_URI` | **Yes (Mandatory)** | MongoDB connection URI with authenticated user and database name. | `mongodb+srv://<user>:<password>@cluster.mongodb.net/floodsignal` |
| `PORT` | Optional | Port for the Express HTTP server (defaults to 5001 if omitted). | `5001` |
| `ALLOWED_ORIGIN` | **Yes (Mandatory in prod)** | Comma-separated list of allowed frontend origins for CORS with credentials. | `https://main.<id>.amplifyapp.com` |

## 4. Local Setup & Administrative Provisioning

### Local Development Setup
1. **Database:** Ensure MongoDB is running locally (`mongodb://localhost:27017`).
2. **Backend Configuration:**
   ```bash
   cd server
   npm install
   # Create server/.env from template:
   cp .env.example .env
   # Ensure JWT_SECRET is populated with a random 256-bit string in server/.env
   npm start
   ```
3. **Frontend Configuration:**
   ```bash
   npm install
   # Create root .env from template:
   cp .env.example .env
   npm run dev
   ```

### Authorized Administrative Provisioning (Server CLI Only)
Public registration strictly creates standard `citizen` accounts. Authorized operators provision privileged municipal responder and admin roles using server-side CLI commands:

- **Promote an existing registered user:**
  ```bash
  cd server
  node promote.js <citizen-email> [responder|admin]
  ```
- **Provision a new municipal account with credentials:**
  ```bash
  cd server
  node provision-responder.js <email> <password> "Responder Name"
  ```

*Security Rule:* Administrative promotion is confined strictly to authenticated server shell access and is never exposed through public HTTP endpoints.

## 5. Production Deployment (AWS Amplify + Backend)

1. **Deploy Frontend on AWS Amplify:**
   - Push repository to GitHub.
   - Connect repository in AWS Amplify Console (Host web app).
   - Use provided `amplify.yml` build specifications (`baseDirectory: dist`).
   - Add environment variable `VITE_API_URL` pointing to your deployed backend API URL (`https://<backend-domain>/api`).

2. **Deploy Backend Service (Render, Railway, or AWS Elastic Beanstalk):**
   - Provide `MONGODB_URI`, `ALLOWED_ORIGIN` (pointing to your Amplify domain), and a strong `JWT_SECRET`.
   - Ensure `NODE_ENV=production` is set so auth cookies enforce `Secure` and `SameSite=None` attributes.

## 6. Public Deployment Verification Checklist
- [ ] **Frontend Load:** The Amplify URL loads successfully and Leaflet map tiles render (OpenStreetMap).
- [ ] **Backend Health:** Navigating to `https://<backend-url>/api/health` returns `{"status":"ok", "databaseConnected":true}`.
- [ ] **JWT Configuration:** Backend fails startup safely if `JWT_SECRET` is unset.
- [ ] **Authentication & Cookies:** Registering or logging in sets an `HttpOnly` session cookie.
- [ ] **Report Vault:** Citizens can view only their own submitted reports via `/api/reports/me`.
- [ ] **RBAC Protection:** Unauthenticated or citizen accounts receive `403 Forbidden` when attempting status changes on `/api/reports/:id/status`.
- [ ] **CORS Validation:** Browser console shows no CORS origin or preflight errors.
- [ ] **Secret Hygiene:** Database URIs, passwords, and JWT signing secrets are absent from network responses and client bundles.
