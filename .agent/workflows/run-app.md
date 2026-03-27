---
description: How to run the complete TailorFlow application (Frontend + Backend)
---

To run the complete application, follow these steps:

### 1. Initialize the Runtime Environment
If you haven't already, ensure you have the necessary dependencies installed in both root and server directories.

```bash
# In the root directory
npm install

# In the server directory
cd server && npm install && cd ..
```

### 2. Start the Backend Server
The backend handles the SQLite database and provides the API.

// turbo
```bash
cd server && npm run dev
```
The server will start on `http://localhost:3001`.

### 3. Start the Frontend Development Server
The frontend is a Vite + React application.

// turbo
```bash
npm run dev
```
The frontend will typically start on `http://localhost:8080` (or `http://localhost:8083` if 8080 is occupied).

### 4. Access the Application
Open your browser and navigate to the Localhost URL provided by the frontend command (e.g., `http://localhost:8083`).

**Default Login Credentials:**
- **Email:** `admin@tailorflow.com`
- **Password:** `admin123`
