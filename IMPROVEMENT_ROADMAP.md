# App Improvement Roadmap

## Phase 1: Security (Critical)
- [ ] **1.1** Move Supabase API key to environment variables
  - File: src/lib/supabase.ts
  - Action: Move key to .env.local, update code

- [ ] **1.2** Rotate exposed Supabase API key IMMEDIATELY
  - Action: Generate new key in Supabase dashboard
  - Action: Update .env.local
  - Action: Revoke old key

## Phase 2: Code Quality (High Impact)
- [ ] **2.1** Add Error Boundary component
  - File: src/components/ErrorBoundary.tsx (new)
  - Action: Create class component for crash recovery

- [ ] **2.2** Create centralized config file
  - File: src/config/index.ts (new)
  - Action: Move all env vars to single config

- [ ] **2.3** Refactor erpApi.ts
  - Split into: httpClient.ts, authApi.ts, checkinApi.ts, errorHandler.ts
  - Action: Modularize ~160 lines of code

- [ ] **2.4** Improve TypeScript types in erpService.ts
  - Action: Define proper interfaces for ERP responses
  - Action: Remove usage of 'unknown' type

- [ ] **2.5** Add environment validation
  - File: src/lib/supabase.ts
  - Action: Validate env vars on app startup

## Phase 3: Performance & UX (Medium)
- [ ] **3.1** Implement React.lazy code splitting
  - File: src/App.tsx
  - Action: Lazy load route components

- [ ] **3.2** Add Network Status Indicator
  - File: src/components/NetworkStatus.tsx (new)
  - Action: Show toast when offline

- [ ] **3.3** Create reusable LoadingSpinner component
  - File: src/components/ui/loading-spinner.tsx (new)
  - Action: Standardize loading states

- [ ] **3.4** Add health check endpoint
  - File: src/components/Dashboard.tsx
  - Action: Ping backend and show status

## Phase 4: Mobile Optimization (Low)
- [ ] **4.1** Improve mobile touch targets
  - Action: Ensure 44x44px minimum touch targets
  - Action: Add haptic feedback

- [ ] **4.2** Enhance form validation
  - Files: LoginPage.tsx, delivery forms
  - Action: Real-time validation, better error messages

## Phase 5: Testing & DevOps (Long-term)
- [ ] **5.1** Setup testing infrastructure
  - Install: vitest, @testing-library/react, jest-dom
  - Action: Write first unit test for erpService

- [ ] **5.2** Add Git hooks
  - Install: lint-staged, husky
  - Action: Prevent commits with console.logs

- [ ] **5.3** Performance audit
  - Action: Run build and analyze bundle size
  - Action: Identify heavy dependencies

---
## Quick Wins (< 30 min each)
- [ ] Add README.md with setup instructions
- [ ] Add .env.example file
- [ ] Add TypeScript strict mode to tsconfig
- [ ] Add Prettier for code formatting
- [ ] Add bundle analyzer script
