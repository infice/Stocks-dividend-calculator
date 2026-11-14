# Impeccable in this project

Installed from https://github.com/pbakaus/impeccable at revision 1995764b4936f2bfbf4eb719cb37b384a45ceacb (skill version 4.9.1). Upstream files, Windows launcher, references, browser assets, and Apache 2.0 license are in .agents/skills/impeccable/.

## Use in agent chat

Codex uses `$impeccable`:
- `$impeccable critique src/app/(tabs)/index.tsx`
- `$impeccable polish src/app/(tabs)/portfolio.tsx`
- `$impeccable audit src/components/ui`

This project's AGENTS.md also maps textual `/impeccable` requests to the same workflow. Claude Code has a project command at .claude/commands/impeccable.md, callable as `/impeccable polish ...`. Skill-picker discovery can require a new session; the local instructions can be read directly in the current session.

PRODUCT.md sets Platform to adaptive so native audit/adapt use iOS and Android guidance. DESIGN.md captures current theme tokens and components. These are initial code-derived context, not user-approved research or a redesign.

## Engine and optional web features

On Windows, the official entry point is:
`.agents\skills\impeccable\scripts\impeccable.cmd context`

The launcher downloads a version-pinned engine on first use and checks its checksum. This environment could not download the engine, so engine-backed commands were not verified. If it is unavailable, the upstream skill documents a fallback: read PRODUCT.md, DESIGN.md, and the requested command reference directly, then continue with permitted tools.

The browser detector, live mode, and automatic edit hook are web-only. No automatic hooks were enabled for this native app. Web live mode requires separate setup and a running web dev server.

## Updating
From a network-enabled terminal at the project root:
`npx impeccable install --providers=codex --scope=project`

Review upstream changes and preserve the project context and Claude command wrapper. The skill files are tooling instructions, not application dependencies.
