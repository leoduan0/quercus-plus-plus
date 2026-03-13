# AWS Hackathon Project

Full-stack web application built for the AWS Hackathon using React, Node/Express, PostgreSQL, and AWS services.

## Tech Stack

| Layer | Local | AWS (Production) |
|---|---|---|
| Frontend | React 19 + Vite | AWS Amplify |
| Backend | Node.js + Express | AWS Lightsail |
| Database | PostgreSQL (Docker) | AWS RDS |
| AI | AWS Bedrock SDK | AWS Bedrock |

## Project Structure

```
AWS Hackathon/
├── Frontend/          # React + Vite app
└── Backend/           # Node.js + Express API
    ├── app.js
    ├── docker-compose.yml
    ├── .env
    └── .env.example
```

## Getting Started

### Prerequisites

- Node.js
- Docker Desktop

### 1. Clone and install dependencies

```bash
# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../Frontend
npm install
```

### 2. Set up environment variables

```bash
cd Backend
cp .env.example .env
# Fill in your values in .env
```

### 3. Start the database

```bash
cd Backend
docker compose up -d
```

### 4. Start the backend

```bash
cd Backend
npm run dev
# Runs on http://localhost:3000
```

### 5. Start the frontend

```bash
cd Frontend
npm run dev
# Runs on http://localhost:5173
```

## AWS Services Used

- **Amazon Bedrock** — Foundation model API (Claude, Titan, etc.)
- **AWS Amplify** — Frontend hosting
- **AWS Lightsail** — Backend hosting
- **Amazon RDS** — Managed PostgreSQL database

## Environment Variables

See `Backend/.env.example` for all required variables. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AWS_REGION` | AWS region (us-west-2) |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `BEDROCK_MODEL_ID` | Bedrock model to use |
| `CLIENT_URL` | Frontend URL for CORS |
