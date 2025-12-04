# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js route files, including `layout.tsx`, `page.tsx`, and global Tailwind styles (`globals.css`).
- `components/ui/`: shadcn/ui primitives (Button, Card, Input, Progress, Textarea) that share styling logic in `lib/utils.ts`.
- `lib/`: lightweight utilities (`cn`) and future shared hooks/helpers.
- `public/`: place static assets here if needed (currently empty). Keep new feature modules inside `app/` and reuse UI primitives whenever possible.

## Build, Test, and Development Commands
- `pnpm install` – install dependencies defined in `package.json`.
- `pnpm dev` – launch the Next.js dev server at http://localhost:3000.
- `pnpm build` – produce the optimized production bundle.
- `pnpm start` – serve the production bundle after building.
- `pnpm lint` – run `next lint`; the first run prompts you to pick an ESLint preset.

## Coding Style & Naming Conventions
- TypeScript-first; prefer `const` and React hooks over classes.
- Tailwind CSS v4 utilities live inline; avoid new CSS modules and rely on shadcn variants (`class-variance-authority`).
- Components and files use PascalCase (`components/ui/Button.tsx`), hooks/utilities camelCase (`lib/cn.ts`).
- Client components under `app/` should begin with the `"use client"` directive.

## Testing Guidelines
- No automated tests yet. When introducing them, colocate files as `Component.test.tsx` or `hook.test.ts` and document the command (e.g., `pnpm test`) in this guide before merging.

## Commit & Pull Request Guidelines
- Keep commits descriptive (e.g., `feat: add playlist export card`).
- PRs should summarize purpose, list verification steps (commands like `pnpm dev`, `pnpm lint`), include screenshots/GIFs for UI tweaks, and reference issues when applicable.

## Agent Tips & Configuration Notes
- Run `pnpm lint` after installing dependencies to finish the ESLint setup prompt once per clone.
- Tailwind scans files listed in `tailwind.config.ts`; add new directories there if you introduce code outside `app/`, `components/`, or `lib/`.
- Prefer existing UI primitives; if you generate new shadcn components, update `components.json` accordingly.
