# Quercus++ (Next.js)

Canvas LMS insights app built with Next.js, Tailwind CSS, and shadcn/ui. All backend logic runs via server actions (Canvas data fetch, AI chat, and syllabus summarization).

## Tech Stack

- Next.js (App Router)
- Tailwind CSS + shadcn/ui
- AWS Bedrock (chat + routing)
- AWS Textract (optional syllabus PDF OCR)

## Getting Started

### Prerequisites

- Node.js 18+

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in your AWS credentials + model id
```

### 3. Run the app

```bash
npm run dev
# http://localhost:3000
```

## Environment Variables

See [.env.example](.env.example) for all required variables.

| Variable | Description |
|---|---|
| `CANVAS_BASE_URL` | Canvas base URL (default https://q.utoronto.ca/api/v1) |
| `AWS_REGION` | AWS region (us-west-2) |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `BEDROCK_MODEL_ID` | Bedrock model to use |
