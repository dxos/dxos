---
description: Audit a Composer plugin against the conventions in the composer-plugin-dev skill.
argument-hint: [path-to-plugin]
---

You are auditing a Composer plugin. The path is `$ARGUMENTS` (default: current directory).

## Checklist

Walk the plugin tree and report **every deviation** from the rules in `skills/composer-plugin-dev/references/`. Use the topic index in `SKILL.md` to navigate. Be specific — cite file paths and line numbers.

### Architecture (`before-you-build.md`)

- Does this plugin duplicate domain types that already exist in another plugin or `@dxos/types` (e.g. service-prefixed copies of `Kanban.Card`)? **Critical.**
- Does it ship a bespoke UI for entities an existing plugin already renders? Should it be a headless sync layer over the existing UI instead?
- For sync/integration plugins: is sync state modeled as a dedicated ECHO object (cursor, external-id mapping, last-sync timestamp)?
- Any cross-object atomicity assumptions that conflict with non-atomic writes in the store? Flag for human review.

### Layout

- `src/` matches `directory-structure.md`?
- `src/index.ts` is minimal (only plugin + meta)?
- Each capability in its own file; barrel uses only `Capability.lazy()`?

### Components vs containers (`components-vs-containers.md`)

- Any `src/components/*` file imports `@dxos/app-framework` or `@dxos/app-toolkit`? **Critical.**
- Containers use `Panel`/`ScrollArea`/`Toolbar`/`Card` instead of custom Tailwind?
- Per-container `index.ts` bridges named → default for `React.lazy`?

### Behavior placement (`operations-vs-ui.md`)

- Any `fetch` / external calls / heavy logic in containers? **Critical.**
- `AccessToken` used for credentials; never in component state?
- `AiService` used for inference; no direct LLM SDK calls in UI?

### Operations & blueprints

- Operations split between `definitions.ts` and per-handler files?
- `OperationHandlerSet.lazy()` in the barrel?
- Blueprint defined and registered? Type metadata references `blueprints: [...]`?

### Types

- Typename is dotted and namespaced; version present?
- `LabelAnnotation` and `IconAnnotation` set?
- `make()` factory using `Obj.make()`?

### Packaging

- `"private": true` (mandatory for new packages)?
- `@dxos/*` deps: `workspace:*` (in-repo) or pinned to Composer host dist-tag (community)?
- Externals via `catalog:` (in-repo)?
- CLI entrypoint imports React or `@dxos/react-ui`? **Critical.**
- Each `exports` subpath matched by a `--entryPoint` in `moon.yml`?

### Tests (`testing.md`)

- A smoke test verifies module activation?
- At least one operation test using `harness.invoke`?
- Tests use `@dxos/plugin-client/cli`, not the main entrypoint?

### Style

- No default exports outside per-container `index.ts`?
- Barrel imports via `#aliases`, no deep relative paths?
- `invariant` for preconditions, not throws?

### Spec (in-repo only)

- `PLUGIN.mdl` exists and matches current behavior?

## Output

Report findings as a structured Markdown summary, grouped by severity (**critical / important / nit**) with file paths and concrete fix suggestions. Skip categories that are clean.
