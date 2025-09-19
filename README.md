# Bare - Skincare Routine Analyzer

A Next.js 14 application that analyzes skincare routines for compatibility and effectiveness using AI.

## Features

- **Product Compatibility Analysis**: Analyze multiple skincare products for interactions and compatibility
- **Expert Insights**: Get detailed analysis from a cosmetic chemist AI
- **Clean Interface**: Simple, intuitive interface for entering and analyzing routines
- **API Endpoints**: RESTful API for programmatic access

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   - Copy `env.example` to `.env.local`
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### GET `/api/ping`
Returns a simple health check with timestamp.

### POST `/api/compatibility`
Analyzes skincare product compatibility.

**Request Body**:
```json
{
  "products": ["Product 1", "Product 2", "Product 3"]
}
```

**Response**: Detailed analysis including compatibility score, routine plan, and product insights.

## Deployment

This project is ready for deployment on Vercel:

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add the `OPENAI_API_KEY` environment variable in Vercel dashboard
4. Deploy

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **OpenAI API** for AI-powered analysis

## Project Structure

```
bare/
├── app/
│   ├── api/
│   │   ├── ping/
│   │   │   └── route.ts
│   │   └── compatibility/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── env.example
```
