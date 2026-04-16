# Auction Platform

Full-stack auction platform with a Spring Boot backend and a React + Vite frontend.

## Tech Stack

- Backend: Java 17, Spring Boot, Spring Security, Spring Data JPA, MySQL, WebSocket
- Frontend: React, Vite, React Router, Axios, STOMP/SockJS

## Local Setup

### Prerequisites

- Java 17
- Maven Wrapper is included
- Node.js and npm
- MySQL running locally

### 1. Configure the backend

Create a private local config file for backend secrets:

```powershell
cd backend/auction-platform
Copy-Item .env.properties.example .env.properties
```

Open `backend/auction-platform/.env.properties` and fill in your own values:

```properties
SERVER_PORT=8081
DB_URL=jdbc:mysql://localhost:3306/auction_db
DB_USERNAME=your_mysql_username
DB_PASSWORD=your_mysql_password
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=change_this_before_first_run
ADMIN_SEED_USERNAME=admin
ADMIN_SEED_FIRST_NAME=Admin
ADMIN_SEED_LAST_NAME=User
```

This file is ignored by Git and loaded automatically by Spring Boot at startup.

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

