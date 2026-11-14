# Existing design system

Captured from src/constants/theme.ts and src/components/ui. This records the implemented baseline, not a new visual direction.

## Visual identity
A restrained green financial utility with neutral surfaces, clear hierarchy, and rounded cards. Keep figures easy to scan and distinguish gains, losses, warnings, and pending data using labels as well as color.

## Tokens
Source of truth: src/constants/theme.ts.
- Light: brand #176B45, background #F4F7F5, surface #FFFFFF, text #17211B, secondary text #627069, border #DDE4DF.
- Dark: brand #70D6A0, background #0E1511, surface #18221C, text #F2F6F3, secondary text #AAB8AF, border #2A3930.
- Semantic danger and warning colors have separate light/dark variants in the token file.
- Spacing scale: 2, 4, 8, 16, 24, 32, 64.
- Radii: 10, 16, 24, pill 999.
- Maximum content width: 800.

## Components and layout
Reuse AppScreen, DetailScreen, SectionCard, MoneyRow, and StatusBadge from src/components/ui. Preserve safe-area handling, scroll behavior, theme hooks, and existing platform-specific navigation implementations.

## Typography and accessibility
Use the existing typography as the baseline; no custom brand font has been established in the theme. Preserve Thai readability, text scaling, clear focus/pressed states, accessible labels, and platform-appropriate touch targets. Avoid clipping large numbers or relying on color alone.

## Verification
Inspect the rendered target at mobile sizes in both themes. Run npm run lint and npm run typecheck after changes. Run calculation tests when behavior or financial formatting changes.

## Authentication surfaces
Signup and email confirmation follow Untitled UI proportions within the existing green theme: a centered 400-wide content column, 56-wide outlined mail mark, 28/40 heading, 16/26 supporting copy, 10-radius outlined fields, and 48-high minimum controls. Use theme foreground-on-brand colors in both themes, safe-area insets, keyboard avoidance, wrapping secondary actions, and scrollable small-screen layouts. Email verification is a dedicated state with the target inbox, resend cooldown, change-email action, and return to sign-in. Callback screens distinguish processing, server-verified success, and recoverable link errors.
