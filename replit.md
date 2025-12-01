# DepoPro - Inventory Management System

## Overview
DepoPro is a comprehensive inventory management web application built with React, TypeScript, and Vite. It provides real-time stock tracking, transaction history, barcode scanning, analytics, and optional cloud synchronization with Supabase.

**Current State:** Successfully configured for Replit environment
- Frontend running on port 5000
- Vite dev server with hot reload enabled
- Ready for development and deployment

## Project Architecture

### Tech Stack
- **Frontend Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 5.2.0
- **Styling:** Tailwind CSS (via CDN)
- **State Management:** React hooks with localStorage
- **Cloud Sync:** Supabase (optional)
- **Barcode Support:** html5-qrcode, jsbarcode
- **Data Export:** xlsx (Excel support)

### Project Structure
```
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard view
│   ├── InventoryList.tsx
│   ├── TransactionHistory.tsx
│   ├── Analytics.tsx    # Lazy-loaded analytics
│   └── ...              # Other modals and components
├── services/           # External service integrations
│   ├── supabase.ts     # Cloud sync (active)
│   ├── firebase.ts     # Disabled
│   └── jsonbin.ts      # Deprecated
├── App.tsx             # Main application component
├── types.ts            # TypeScript type definitions
├── constants.ts        # Initial data and constants
└── vite.config.ts      # Vite configuration
```

### Key Features
- **Product Management:** Add, edit, delete products with barcodes
- **Stock Tracking:** Real-time inventory with min stock alerts
- **Transactions:** Track IN/OUT/ADJUSTMENT transactions
- **Order Management:** Create and track orders
- **Barcode Scanning:** Scan products using device camera
- **Analytics:** Charts and insights (lazy-loaded)
- **Data Backup:** Export/import via JSON and Excel
- **Cloud Sync:** Optional Supabase integration
- **Dark Mode:** Toggle between light/dark themes
- **PWA Support:** Service worker for offline capability

## Recent Changes (Replit Setup)

### December 1, 2025
- Installed Node.js 20 runtime
- Configured Vite dev server:
  - Host: `0.0.0.0` (required for Replit)
  - Port: `5000` (frontend)
  - Allowed hosts: `true` (bypasses host header check for proxy)
- Set up "Start application" workflow
- Configured static deployment with build step
- All dependencies installed successfully

## Configuration

### Development
The app runs with `npm run dev` which starts Vite dev server on port 5000. The configuration in `vite.config.ts` ensures compatibility with Replit's proxy system.

### Environment Variables
The app uses Supabase for optional cloud sync. Configuration is stored in localStorage under `depopro_cloud_config` and includes:
- Supabase URL
- Supabase API Key

No environment variables are required for basic functionality. The app works entirely with localStorage by default.

### Database Schema (Supabase)
When cloud sync is enabled, the following tables are used:
- `products`: Product inventory data
- `transactions`: Stock movement history
- `orders`: Order tracking

SQL schema is provided in the CloudSetupModal component for easy Supabase setup.

## User Preferences
- **Language:** Turkish (default interface language)
- **Storage:** Primarily localStorage-based with optional cloud sync
- **Performance:** Heavy components (Analytics, BarcodePrinter) are lazy-loaded

## Development Guidelines
- The app is designed to work offline-first with localStorage
- Cloud sync is optional and user-configurable
- Components follow React functional patterns with hooks
- TypeScript is used throughout for type safety
- Tailwind CSS classes are used for styling

## Deployment
The app is configured as a static site deployment:
- Build command: `npm run build`
- Output directory: `dist`
- Deployment type: Static (client-side only)

## Known Considerations
- Tailwind CSS is loaded via CDN (shows warning in console for production use)
- Security vulnerabilities in dependencies (2 moderate, 1 high) - review with `npm audit`
- Service worker enables PWA functionality
- No backend server required for basic operation
