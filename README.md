# Auction Platform

Full-stack auction platform with a Spring Boot backend and a React + Vite frontend.

## Tech Stack

- Backend: Java 17, Spring Boot, Spring Security, Spring Data JPA, MySQL, WebSocket
- Frontend: React, Vite, React Router, Axios, STOMP/SockJS

## Before You Publish This Repo

1. Do not commit real passwords, usernames, tokens, or database credentials.
2. Keep local-only values in environment variables or untracked `.env` files.
3. Review everything before the first push:
   - `backend/auction-platform/src/main/resources/application.properties`
   - `.gitignore`
   - any screenshots, exports, or generated build folders
4. If a secret was ever committed anywhere, rotate it before making the repo public.

## Local Setup

### Prerequisites

- Java 17
- Maven Wrapper is included
- Node.js and npm
- MySQL running locally

### 1. Configure the backend

Use `backend/auction-platform/.env.example` as a reference for the values you need.

```powershell
cd backend/auction-platform
Get-Content .env.example
```

Then set these environment variables in PowerShell before starting the backend.
Spring Boot will read them from the shell environment:

```powershell
$env:SERVER_PORT="8081"
$env:DB_URL="jdbc:mysql://localhost:3306/auction_db"
$env:DB_USERNAME="your_mysql_username"
$env:DB_PASSWORD="your_mysql_password"
$env:JWT_SECRET="replace_with_a_long_random_secret"
$env:ADMIN_SEED_EMAIL="admin@example.com"
$env:ADMIN_SEED_PASSWORD="change_this_before_first_run"
$env:ADMIN_SEED_USERNAME="admin"
$env:ADMIN_SEED_FIRST_NAME="Admin"
$env:ADMIN_SEED_LAST_NAME="User"
```

Create the MySQL database if it does not exist yet:

```sql
CREATE DATABASE auction_db;
```

Start the backend:

```powershell
cd backend/auction-platform
.\mvnw.cmd spring-boot:run
```

The backend runs on `http://localhost:8081`.

### 2. Configure the frontend

Create the frontend env file:

```powershell
cd frontend
Copy-Item .env.example .env
```

Install dependencies and start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

## Default Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8081/api`

## Create a GitHub Repo Safely

1. In GitHub, click **New repository**.
2. Choose a repo name and set visibility to `Private` first.
3. Do not add a new README or `.gitignore` from GitHub because this project already has them.
4. In this project folder, initialize Git and make the first commit:

```powershell
cd C:\New_Mini_Project
git init
git add .
git status
git commit -m "Initial commit"
```

5. Check `git status` carefully before every push to confirm no secrets or local files are staged.
6. Add the GitHub remote and push:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

7. After the private repo looks clean, change it to public in GitHub settings if you want others to see it.

## Safety Checklist Before Making It Public

- No real credentials in tracked files
- No `.env` files committed
- No `node_modules`, `dist`, `target`, or IDE folders committed
- README instructions work for a fresh local setup
