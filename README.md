# Dagligvaror

A grocery management application built with Next.js, TypeScript, and Prisma.

## Features

- User authentication with NextAuth.js
- Grocery list management
- User settings and preferences
- Responsive design with Material-UI

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **UI**: Material-UI (MUI)
- **Styling**: SCSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Update the `.env.local` file with your database URL and authentication secrets.

4. Set up the database:
   ```bash
   npm run prisma:migrate:dev
   npm run prisma:generate:local
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run prisma:migrate:dev` - Run database migrations
- `npm run prisma:generate:local` - Generate Prisma client

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── (private)/         # Protected routes
│   ├── (public)/          # Public routes
│   └── api/               # API routes
├── components/            # Reusable components
├── lib/                   # Utility functions
├── prisma/                # Database schema
├── styles/                # Global styles and themes
└── types/                 # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

Private project - All rights reserved.