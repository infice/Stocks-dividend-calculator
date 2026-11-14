# Tonthun (Stocks dividend calculator)

## Product
A personal stock portfolio and transaction ledger. Help users enter trades and understand their holdings, cost basis, and realized profit or loss. Financial clarity and accurate, traceable numbers take priority over decoration.

## Platform
adaptive

Expo SDK 58 / React Native / TypeScript with Expo Router. Target iOS and Android with platform-appropriate interaction; preserve the existing web implementation.

## Current implementation
- Overview, portfolio, and transaction tabs.
- Account and trade entry, profit-source details, and settings.
- Supabase authentication and account-scoped financial data.
- Draft and confirmed trade states; pending fees and stale/error states.
- FIFO and moving-average calculations implemented in src/domain/portfolio.

## Sources of truth
Read applicable requirements in doc/, especially the SRS and implementation backlog, before changing behavior. Use current code to distinguish implemented features from planned work.

## Constraints
- Follow AGENTS.md and fetch matching Expo docs before changing native APIs.
- Keep calculation rules, precision, currencies, confirmation states, and data access intact during UI refinement.
- Reuse src/constants/theme.ts and existing UI components.
- Support Thai copy, long financial values, light/dark themes, and small screens.
- Do not add invented market prices, returns, or unsupported financial claims.
- User research, detailed audience segments, and additional brand requirements remain unspecified; ask only when the requested work depends on them.
