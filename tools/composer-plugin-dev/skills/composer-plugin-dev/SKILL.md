---
name: composer-plugin-dev
description: Author DXOS Composer plugins — primarily community plugins built in their own repo (Vite + composerPlugin, GitHub release, registered via dxos/community-plugins), with notes on how the in-repo workflow differs. Use when scaffolding a new Composer plugin, wiring capabilities (surfaces, operations, blueprints), exposing operations to AI agents, integrating external services, testing with the composer testing harness, or publishing to the community registry.
---

# Composer Plugin Authoring

**Audience.** This skill is for authors building a Composer plugin **outside the dxos monorepo** — in your own GitHub repository, packaged as a community plugin. Inside the monorepo (`packages/plugins/plugin-*`), most patterns are identical, but a handful of things change (build system, dep specifiers, package layout, registration, spec language). Each section below has an **"Inside the dxos monorepo"** callout where it differs.

**Reference plugins.**

- Community: [`dxos/plugin-excalidraw`](https://github.com/dxos/plugin-excalidraw), [`dxos/plugin-youtube`](https://github.com/dxos/plugin-youtube).
- Registry: [`dxos/community-plugins`](https://github.com/dxos/community-plugins) — the JSON index Composer reads.
- In-repo exemplar: [`packages/plugins/plugin-chess`](https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess).

When in doubt, copy a working plugin and modify.

---

## How to use this skill

Each topic below links to a focused reference file under `references/`. Read the index first, then jump to the file you need. Files are short and self-contained; don't try to read them all at once.

## Topics

### Getting started

1. **[Scaffolding a community plugin](references/scaffolding.md)** — minimum viable repo: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/plugin.tsx`, `src/meta.ts`. What to clone from `plugin-excalidraw`.
2. **[Directory structure](references/directory-structure.md)** — the canonical `src/` layout (`capabilities/`, `components/`, `containers/`, `types/`, `operations/`, `blueprints/`, `translations.ts`, `meta.ts`, `plugin.tsx`).
3. **[Plugin definition](references/plugin-definition.md)** — `Plugin.define(meta).pipe(...)` with `AppPlugin.add*Module` helpers. Activation events. The wiring order that works.

### UI

4. **[Components vs containers](references/components-vs-containers.md)** — the **non-negotiable separation**. `src/components/` are presentational primitives with **no `@dxos/app-framework` or `@dxos/app-toolkit` dependency**. `src/containers/` consume capabilities, are surface-aware, and are always lazy-loaded. Why this split exists and how it keeps your plugin testable.
5. **[Components](references/components.md)** — named exports only, one subdir per component, basic storybook each.
6. **[Containers & UI primitives](references/containers.md)** — `Panel.Root` / `Panel.Toolbar` / `Panel.Content` / `ScrollArea` / `Toolbar` / `Card` patterns. **Never write custom layout classNames** when a primitive exists. Article/Card/Section role suffix conventions.
7. **[React surface](references/react-surface.md)** — `Surface.create()` with `AppSurface.object(role, Type)` filters. Common roles: `article`, `section`, `card--content`, `object-properties`, `dialog`.

### Data

8. **[ECHO types & schemas](references/types-schema.md)** — `Type.object({ typename, version })`, `LabelAnnotation`, `Annotation.IconAnnotation`, namespace re-export (`export * as Foo from './Foo'`), `make()` factory using `Obj.make()`, `FormInputAnnotation`.
9. **[Translations](references/translations.md)** — keyed by **typename** (object labels) **and** `meta.id` (plugin-scoped strings). `useTranslation(meta.id)` in components.

### Behavior — keep it out of the UI

10. **[Operations vs UI: where logic belongs](references/operations-vs-ui.md)** — **put large computations, side effects, and external-service integrations into operations, not UI code.** UI components stay thin. Operations are testable, schema-typed, reusable from blueprints, callable from CLI, and re-runnable.
11. **[Operations](references/operations.md)** — `Operation.make({ meta, input, output, services })`, `Operation.withHandler(Effect.fn(...))`, `OperationHandlerSet.lazy()`. Splitting `definitions.ts` from per-handler files. Why services declare what they need.
12. **[External services & authentication (`AccessToken`)](references/external-services.md)** — store credentials as `AccessToken` ECHO objects referenced by `Ref.Ref<AccessToken>`; load inside an operation using an Effect helper. **Never** read raw secrets in containers. Worked example modeled after `plugin-inbox`.
13. **[AI inference (`AiService`)](references/ai-service.md)** — when you need an LLM call, do it inside an operation with `AiService.model('@anthropic/claude-sonnet-4-5')`, tools via `OpaqueToolkit`, executor via `ToolExecutionService`. Don't call models from React.
14. **[Blueprints — let agents use your plugin](references/blueprints.md)** — define a blueprint key, gather your operations, `Blueprint.toolDefinitions({ operations })`, write a short instruction template. **Every plugin worth writing should ship a blueprint** so the assistant can drive it. How to register via `addBlueprintDefinitionModule`.
15. **[Capabilities](references/capabilities.md)** — `Capability.lazy()` in `capabilities/index.ts`, `Capability.makeModule()` per file, `Capability.contributes(Capabilities.X, ...)`. Why everything is lazy.

### Packaging & publishing

16. **[`package.json`](references/package-json.md)** — community-plugin form (single bundled module, deps pinned to a Composer release tag) vs. monorepo form (`workspace:*`, multiple `exports`, `imports` aliases, `"private": true`). The **CLI entrypoint contract**: `cli` must export **only blueprint, operations, and types** — no React, no app-framework UI capabilities — so it can run under Node.
17. **[`vite.config.ts` (community plugins)](references/vite-config.md)** — `composerPlugin({ entry: 'src/plugin.tsx', meta })` from `@dxos/app-framework/vite-plugin`, plus `react()` and `wasm()`. Emits `dist/plugin.mjs` and `dist/manifest.json`.
18. **[`moon.yml` (in-repo only)](references/moon-yml.md)** — `compile.args` lists one `--entryPoint` per `package.json` `exports` subpath. Skip if you're outside the monorepo.
19. **[Publishing to the community registry](references/publishing.md)** — full release workflow:
    - GitHub Actions build → release with `manifest.json` + `plugin.mjs` assets.
    - Pin all `@dxos/*` deps to the Composer host's main dist-tag.
    - Local testing via Composer **Settings → Plugins → Load by URL**.
    - Submit a PR to [`dxos/community-plugins`](https://github.com/dxos/community-plugins) adding `{ "repo": "owner/repo" }` to `community-plugins.json`.
    - Registry syncs into Composer roughly every 5 minutes.

### Quality

20. **[Testing with the composer harness](references/testing.md)** — `createComposerTestApp({ plugins: [...] })` from `@dxos/plugin-testing/harness`. Two minimum tests every plugin should have: a **smoke test** (modules activate on the right events) and an **operation test** (`harness.invoke(MyOp, input)`). Use the CLI variant of `ClientPlugin` (the main one references browser-only capabilities). Storybook for containers.
21. **[Coding style](references/coding-style.md)** — `invariant` over throws; barrel imports (`#capabilities`, `#components`, etc.); no default exports except container `index.ts` (for `React.lazy`); ESM `#private` over TS `private` in new code; reactive ECHO (`useQuery`, `useObject`, atoms).
22. **[Build & verify](references/build-test.md)** — community: `pnpm build`, `pnpm test`. Monorepo: `moon run plugin-foo:build|lint|test|test-storybook`.

### Inside the dxos monorepo (only)

23. **[`PLUGIN.mdl` specification](references/specification.md)** — the design-first spec language (MDL). **The `PLUGIN.mdl` is the design document.** Approve before writing code; update before changing features. Template at `packages/plugins/plugin-spec/docs/PLUGIN-.template.mdl`. Community plugins can adopt this voluntarily, but it isn't required.
24. **[Registering with `composer-app`](references/registration.md)** — for in-repo plugins only: add to the composer app's plugin list. Community plugins are loaded dynamically by Composer from the registry; no registration step.

---

## Quick decision tree

- **"Where do I put this code?"** Heavy logic → `operations/`. External call → `operations/` (with `AccessToken`). LLM call → `operations/` (with `AiService`). Layout → `containers/` using `Panel`/`ScrollArea`/`Toolbar`/`Card`. Reusable presentational → `components/` (no framework deps).
- **"Should agents be able to do this?"** If yes — and the answer is usually yes — define an `Operation` and reference it from a `Blueprint`.
- **"Where does this belong in `package.json` exports?"** Browser/UI surfaces → main entry. Headless logic the CLI/agents need → `./blueprints`, `./operations`, `./types`. Keep `./cli` free of React.
- **"Do I need `moon.yml`?"** Only inside the monorepo.

## Common mistakes

- Importing `@dxos/app-framework` from `src/components/`. (Use `containers/`.)
- Calling `fetch` / external APIs / LLMs directly from a container. (Move to an operation.)
- Skipping the blueprint, leaving the assistant unable to drive the plugin.
- Writing custom Tailwind layout instead of using `Panel` / `ScrollArea` / `Toolbar` / `Card`.
- Adding non-lazy exports to `capabilities/index.ts`.
- Putting React imports in the CLI entrypoint.
- Hard-coding secrets instead of using `AccessToken` Refs.
- Pinning `@dxos/*` deps to arbitrary versions instead of the Composer host's main dist-tag.
