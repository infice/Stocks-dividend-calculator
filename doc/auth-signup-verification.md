# Email signup and callback verification

## Direction contract
- THESIS: Finish email signup with a clear handoff to the inbox and an explicit return path.
- OWN-WORLD: Untitled UI inspired layout, restrained green brand, outlined mail symbol, 10px controls, neutral theme surfaces; native safe areas and keyboard avoidance.
- STORY: Enter email and password, check the named inbox, confirm, return to a server-validated session. Retry email delivery without losing the pending screen.
- FIRST VIEWPORT: Centered 400px maximum form, 56px mail symbol, 28px heading, email and supporting copy, full-width primary action, resend and change-email actions below. Loading remains within the mounted screen.
- FORM: seed: none (pinned), user requested “ตามสไตล์ untitled design system”. Local auth extension, code-led.
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Configuration required outside the app
In Supabase Authentication > URL Configuration > Redirect URLs, allow:
- `tonthun://auth/callback` for installed iOS/Android development or production builds.
- The exact web origin plus `/auth/callback`, for example `http://localhost:8083/auth/callback` during local web testing, and the deployed HTTPS URL for production.

Keep Confirm email enabled in the email provider settings. Email templates must use `{{ .ConfirmationURL }}` so Supabase verifies the email before redirecting. A template linking straight to SiteURL does not verify it. Do not disable email confirmation to solve redirect errors.

`EXPO_PUBLIC_AUTH_REDIRECT_URL` applies to native builds. Web uses the current origin unless `EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL` is supplied. Changing public environment values requires restarting Expo. A web override must point to the same browser storage origin for PKCE exchange.

For Expo Go, remove the native redirect override so `Linking.createURL` generates the running Expo Go callback, and allow that exact development URL in Supabase. For reliable email linking, use an installed development build with the registered `tonthun` scheme. A scheme-config change requires a new native build; CNG directories are not edited manually.

PKCE needs the app/browser storage that initiated signup. If a confirmation opens in another browser or device, Supabase may verify the email while the session exchange cannot finish there. Return to the original app and sign in with email/password. Request a fresh link if it has expired.

## Verification checklist
- Signup contains only email/password and sends `display_name` from the email local part.
- With email confirmation enabled, successful signup shows the inbox screen; failed submission retains typed input.
- Resend shows a 60-second cooldown after success; rate-limit/network failures remain recoverable.
- A valid PKCE callback exchanges once, verifies `getUser().email_confirmed_at`, then offers entry to the app.
- Expired/missing/mismatched callbacks never claim successful confirmation. Legacy fragment-token callbacks are supported.
- Password recovery callbacks continue to the password update form, not directly into portfolio content.
- Test an installed iOS/Android build both cold and already running, and web in light/dark at a narrow viewport with large text.

## Review evidence
Database read on 2026-11-14: the project had one email account, and it was confirmed. No user records or auth settings were changed.
Automated callback parsing/name tests cover native, Expo Go, web, recovery/error fragments, and rejecting mismatched origins/paths. Native email round-trip and hosted redirect allowlist still require device/dashboard verification; no emulator is installed in this workspace.

### Visual review
Reviewed the actual web sign-in and signup render in dark theme on the local Expo server. Signup shows only email/password, an automatic-name explanation, and intact primary/secondary actions. Browser review is not evidence for native rendering. The inbox/success states and native layouts still need device-based visual QA.
The expired-link callback was also checked on web: it displayed the recovery guidance, removed callback query parameters from the address, and the return button restored the sign-in form. Final automated checks: 36 tests passed, lint and TypeScript passed. Verdict: implementation ready for native/device and hosted redirect configuration verification; no claim of native end-to-end validation.

## Follow-up: redirect configuration corrected (2026-11-14)
Observed the hosted Supabase URL Configuration: Site URL was http://localhost:3000 and the only allowed redirect was tonthun://auth/callback. This explained why web confirmations could verify an account without returning to the running web app.
Changed hosted Site URL to http://localhost:8081/auth/callback and added that exact web callback to Redirect URLs, retaining the native callback. Verified saved values in the dashboard. Email delivery uses Supabase default templates.
Verified the actual Supabase /auth/v1/verify endpoint with a deliberately invalid non-user token and the web redirect target: it redirected to localhost:8081/auth/callback with otp_expired, and the app rendered its recoverable error screen and removed URL error parameters. This checks the hosted redirect path without creating an account or sending email; a fresh valid email confirmation was not exercised.
The reported Metro unknown-module error did not reproduce in the user's browser during this check. Full reload retained the authenticated session, and overview, portfolio, and transactions rendered successfully. The running Metro manifest confirmed this workspace. A cache-clearing restart was attempted but the OS denied stopping its process; no other processes were stopped and no dependency or routing setting was changed. If the same module error recurs, stop the original Expo terminal and run npx expo start --web --port 8081 --clear, then fully reload the browser.
