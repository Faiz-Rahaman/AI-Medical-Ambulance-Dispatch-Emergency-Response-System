# 🚑 AI Ambulance Dispatch System — Complete Setup Guide

A complete, beginner-friendly setup guide to get the **AI Medical Ambulance Dispatch & Emergency Response System** running on a new computer after cloning from GitHub.

---

## 📋 Table of Contents
1. [Prerequisites](#-1-prerequisites)
2. [Step 1: Clone the Repository](#-step-1-clone-the-repository)
3. [Step 2: MySQL Database Setup](#-step-2-mysql-database-setup)
4. [Step 3: Backend Setup (FastAPI)](#-step-3-backend-setup-fastapi)
5. [Step 4: Frontend Setup (React)](#-step-4-frontend-setup-react)
6. [Step 5: Run & Verify the Application](#-step-5-run--verify-the-application)
7. [Step 6 (Optional): Local LLM Setup with LM Studio](#-step-6-optional-local-llm-setup-with-lm-studio)
8. [Troubleshooting & Common Issues](#-troubleshooting--common-issues)

---

## 🛠️ 1. Prerequisites

Make sure the following software is installed on your laptop:

| Tool | Version | Download Link | Notes |
| :--- | :--- | :--- | :--- |
| **Python** | 3.10, 3.11, or 3.12 | [python.org](https://www.python.org/downloads/) | ⚠️ Check **"Add Python to PATH"** during installation |
| **Node.js** | v18 or v20 LTS | [nodejs.org](https://nodejs.org/) | Includes `npm` package manager |
| **MySQL Server** | 8.0+ or XAMPP | [mysql.com](https://dev.mysql.com/downloads/mysql/) / [apachefriends.org](https://www.apachefriends.org/) | Starts MySQL on `localhost:3306` |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | For cloning the repo |

---

## 📥 Step 1: Clone the Repository

Open your terminal (PowerShell, Command Prompt, or Bash) and clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd AI_Ambulance_Dispatch_System
```

---

## 🗄️ Step 2: MySQL Database Setup

1. **Start your MySQL server** (via MySQL Service, MySQL Workbench, or XAMPP Control Panel).
2. Open your MySQL CLI or Workbench and create the database:

```sql
CREATE DATABASE IF NOT EXISTS medicalsystem;
```

> **Note**: Remember your MySQL username (usually `root` or a custom username) and password. You will need them in the backend configuration.

---

## ⚙️ Step 3: Backend Setup (FastAPI)

Open a terminal in the project root and run:

### 1. Navigate to Backend Folder
```bash
cd backend
```

### 2. Create and Activate a Python Virtual Environment

- **Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\activate
  ```
  *(If you get a script execution policy error in PowerShell, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

- **Windows (Command Prompt / CMD)**:
  ```cmd
  python -m venv venv
  venv\Scripts\activate.bat
  ```

- **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### 3. Install Required Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Create Backend `.env` File
Copy the example environment file:
- **Windows (PowerShell / CMD)**:
  ```powershell
  copy .env.example .env
  ```
- **macOS / Linux**:
  ```bash
  cp .env.example .env
  ```

Open `backend/.env` and update your values:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
DATABASE_URL=mysql+pymysql://root:your_mysql_password@localhost/medicalsystem

# Local LLM (LM Studio)
LOCAL_LLM_URL=http://localhost:1234/v1/chat/completions
LOCAL_LLM_MODEL=google/gemma-4-12b-qat
LOCAL_LLM_REASONING=off
```

### 5. Check Database Connection String
Open `backend/app/database.py` and ensure the `DATABASE_URL` matches your local MySQL username and password:
```python
DATABASE_URL = "mysql+pymysql://root:your_mysql_password@localhost/medicalsystem"
```

### 6. Seed Demo Hospitals, Ambulances & Clinical System Prompt
Run the network seeder script to populate real hospitals and ambulances near Amrita Vishwa Vidyapeetham (Vengal / Tiruvallur):
```bash
# Seed 10 real hospitals & 12 ambulances near Amrita Vishwa Vidyapeetham, Vengal
python seed_vengal_network.py

# Sync the emergency-first clinical triage prompt to MySQL
python update_db_prompt.py
```
*You should see:* `🎉 Seeded 10 real hospitals & 12 ambulances` and `Successfully updated prompt record in database!`

### 7. Start the Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
- Backend API will be active at: `http://localhost:8000`
- Interactive API Docs (Swagger UI): `http://localhost:8000/docs`

---

## 💻 Step 4: Frontend Setup (React)

Open a **new separate terminal window**:

### 1. Navigate to the Frontend Directory
```bash
cd frontend/default
```

### 2. Create Frontend `.env` File
Copy the example environment file:
- **Windows (PowerShell / CMD)**:
  ```powershell
  copy .env.example .env
  ```
- **macOS / Linux**:
  ```bash
  cp .env.example .env
  ```

Open `frontend/default/.env` and verify:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
REACT_APP_DEFAULTAUTH=fake
GENERATE_SOURCEMAP=false
```

### 3. Install Node Dependencies
```bash
npm install --legacy-peer-deps
```
*(Note: `--legacy-peer-deps` ensures full compatibility with the dashboard UI components).*

### 4. Start the Frontend Development Server
```bash
npm start
```
- The React Command Center dashboard will automatically open at: `http://localhost:3000`

---

## 🚀 Step 5: Run & Verify the Application

Once both servers are running:
1. Open your browser and go to `http://localhost:3000`.
2. You will see the **AI Ambulance Dispatch Command Center**.
3. Explore:
   - **Live Map & Dispatch Dashboard**: View active ambulances, GPS locations, and fuel levels.
   - **Emergency Intake / Triage**: Submit a patient emergency case and watch the AI calculate severity and dispatch the nearest eligible ambulance ($\ge 50\%$ fuel).
   - **Backend Docs**: Check `http://localhost:8000/docs` to test APIs directly.

---

## 🤖 Step 6 (Optional): Local LLM Setup with LM Studio

### Local LLM with LM Studio (Offline AI Triage)
1. Install [LM Studio](https://lmstudio.ai/).
2. Search and download a model (e.g., `Gemma-2-9B`, `Llama-3.2-3B`, or `Mistral-7B-Instruct`).
3. Navigate to the **Local Server** tab (`<->`), load the downloaded model, and click **Start Server** on port `1234`.
4. The backend triage engine will automatically connect to `http://localhost:1234/v1/chat/completions`.

---

## 🔍 Troubleshooting & Common Issues

| Error / Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **`Access denied for user 'root'@'localhost'`** | MySQL password mismatch | Update `backend/app/database.py` and `backend/.env` with your actual MySQL password. |
| **`Unknown database 'medicalsystem'`** | Database not created | Run `CREATE DATABASE medicalsystem;` in MySQL. |
| **`npm install` fails with ERESOLVE** | React package peer dependency conflict | Run `npm install --legacy-peer-deps` or `npm install --force`. |
| **`Port 8000` or `Port 3000` already in use** | Another application is using the port | Run `netstat -ano \| findstr :8000` and kill the PID with `taskkill /PID <PID> /F` (Windows). |
| **Google Maps shows gray or "Development purposes only"** | Missing or restricted API key | Provide a valid Google Maps API Key in both `backend/.env` and `frontend/default/.env`. |
| **PowerShell Execution Policy Error on activating venv** | Script execution restricted by default | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell and re-activate. |
