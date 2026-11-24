# Capability Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize cross-plugin capability names to a consistent `Provider`/`Service`/`Extension` suffix, expose `./types` subpaths on the two defining plugins missing them, rename implementation files to match the capability they contribute, extract one inline contribution to a proper capabilities file, and document the pattern in the composer-plugins skill.

**Architecture:** Each `Capability.make` key lives in `src/types/XCapabilities.ts` of the defining plugin and is re-exported via a `./types` package subpath. Implementing (donor) plugins place contributions in dedicated `src/capabilities/<capability-name>.ts` files and import the key from `@dxos/plugin-X/types`. Framework capabilities (`AppCapabilities`, `SpaceCapabilities`, `Capabilities.*`) are out of scope.

**Tech Stack:** TypeScript, `@dxos/app-framework` `Capability` API, moon build system, pnpm workspaces.

---

## Proposed renames

| Plugin                 | Old name                                         | New name                                                 | Reason                                     |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------ |
| `plugin-calls`         | `CallsCapabilities.Extension`                    | `CallsCapabilities.EventHandler`                         | rename to reflect callback/event semantics |
| `plugin-game`          | `GameCapabilities.Variant`                       | `GameCapabilities.VariantProvider`                       | missing Provider suffix                    |
| `plugin-markdown`      | `MarkdownCapabilities.Extensions`                | `MarkdownCapabilities.ExtensionProvider`                 | plural → singular Provider suffix          |
| `plugin-transcription` | `TranscriptionCapabilities.Transcriber`          | `TranscriptionCapabilities.TranscriberProvider`          | missing Provider suffix                    |
| `plugin-transcription` | `TranscriptionCapabilities.TranscriptionManager` | `TranscriptionCapabilities.TranscriptionManagerProvider` | missing Provider suffix                    |
| `plugin-map`           | `MapCapabilities.MarkerProvider`                 | (no change)                                              | —                                          |
| `plugin-trip`          | `TripCapabilities.BookingService`                | (no change)                                              | —                                          |
| `plugin-trip`          | `TripCapabilities.RoutingService`                | (no change)                                              | —                                          |

---

## Task 1: Add `./types` export to plugin-trip and plugin-calls

Both already compile `src/types/index.ts` (confirmed in `moon.yml`); `package.json` is just missing the subpath entry.

**Files:**

- Modify: `packages/plugins/plugin-trip/package.json`
- Modify: `packages/plugins/plugin-calls/package.json`

- [ ] **Step 1: Add `./types` export to plugin-trip/package.json**

  In the `"exports"` object, after the `"."` entry, add:

  ```json
  "./types": {
    "source": "./src/types/index.ts",
    "types": "./dist/types/src/types/index.d.ts",
    "default": "./dist/lib/neutral/types/index.mjs"
  },
  ```

- [ ] **Step 2: Add `./types` export to plugin-calls/package.json**

  Same pattern:

  ```json
  "./types": {
    "source": "./src/types/index.ts",
    "types": "./dist/types/src/types/index.d.ts",
    "default": "./dist/lib/neutral/types/index.mjs"
  },
  ```

- [ ] **Step 3: Build and verify**

  ```bash
  moon run plugin-trip:build plugin-calls:build
  ```

  Expected: both build cleanly.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/plugins/plugin-trip/package.json packages/plugins/plugin-calls/package.json
  git commit -m "feat(plugin-trip,plugin-calls): expose ./types subpath export"
  ```

---

## Task 2: Rename `GameCapabilities.Variant` → `GameCapabilities.VariantProvider`

**Files to change:**

- Modify: `packages/plugins/plugin-game/src/types/GameCapabilities.ts`
- Modify: `packages/plugins/plugin-game/src/capabilities/create-object.ts`
- Modify: `packages/plugins/plugin-game/src/components/CreateGamePanel.tsx`
- Modify: `packages/plugins/plugin-game/src/containers/GameArticle/GameArticle.tsx`
- Modify: `packages/plugins/plugin-game/src/containers/GameCard/GameCard.tsx`
- Modify: `packages/plugins/plugin-game/src/meta.ts`
- Modify: `packages/plugins/plugin-game/PLUGIN.mdl`
- Modify: `packages/plugins/plugin-chess/src/capabilities/game-variant.ts`
- Modify: `packages/plugins/plugin-tictactoe/src/capabilities/game-variant.ts`

- [ ] **Step 1: Rename the capability key**

  In `plugin-game/src/types/GameCapabilities.ts`, change the export and JSDoc:

  ```ts
  /**
   * A game variant registered by a variant plugin (e.g. plugin-chess).
   * Variant plugins contribute one of these via `Capability.contributes(GameCapabilities.VariantProvider, variant)`.
   * Consumers iterate via `Capability.getAll(GameCapabilities.VariantProvider)` (Effect) or
   * `useCapabilities(GameCapabilities.VariantProvider)` (React).
   */
  export const VariantProvider = Capability.make<GameVariant>(`${meta.id}.capability.variant`);
  ```

  Note: the capability ID string (`capability.variant`) is intentionally NOT changed — it would break persisted capability registrations.

- [ ] **Step 2: Find and update all internal usages in plugin-game**

  ```bash
  grep -rn "GameCapabilities\.Variant\b" packages/plugins/plugin-game/src/
  ```

  Replace every occurrence with `GameCapabilities.VariantProvider`.

  Key locations:
  - `src/capabilities/create-object.ts`: `Capability.getAll(GameCapabilities.VariantProvider)`
  - `src/components/CreateGamePanel.tsx`: `useCapabilities(GameCapabilities.VariantProvider)`
  - `src/containers/GameArticle/GameArticle.tsx`: `useCapabilities(GameCapabilities.VariantProvider)`
  - `src/containers/GameCard/GameCard.tsx`: `useCapabilities(GameCapabilities.VariantProvider)`
  - `src/meta.ts`: update docstring reference

- [ ] **Step 3: Update PLUGIN.mdl**

  ```bash
  grep -n "GameCapabilities\.Variant\b" packages/plugins/plugin-game/PLUGIN.mdl
  ```

  Replace all occurrences with `GameCapabilities.VariantProvider`.

- [ ] **Step 4: Update plugin-chess contributor**

  In `plugin-chess/src/capabilities/game-variant.ts` line 43:

  ```ts
  export default Capability.makeModule(() =>
    Effect.succeed(Capability.contributes(GameCapabilities.VariantProvider, variant)),
  );
  ```

- [ ] **Step 5: Update plugin-tictactoe contributor**

  In `plugin-tictactoe/src/capabilities/game-variant.ts` line 61:

  ```ts
  export default Capability.makeModule(() =>
    Effect.succeed(Capability.contributes(GameCapabilities.VariantProvider, variant)),
  );
  ```

- [ ] **Step 6: Build and lint**

  ```bash
  moon run plugin-game:build plugin-chess:build plugin-tictactoe:build
  moon run plugin-game:lint plugin-chess:lint plugin-tictactoe:lint -- --fix
  ```

  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add packages/plugins/plugin-game packages/plugins/plugin-chess packages/plugins/plugin-tictactoe
  git commit -m "refactor(plugin-game): rename GameCapabilities.Variant → VariantProvider"
  ```

---

## Task 3: Rename `MarkdownCapabilities.Extensions` → `MarkdownCapabilities.ExtensionProvider`

Also: extract plugin-mermaid's inline contribution to a proper `Capability.makeModule` file.

**Files to change:**

- Modify: `packages/plugins/plugin-markdown/src/types/MarkdownCapabilities.ts`
- Modify: `packages/plugins/plugin-markdown/src/capabilities/react-surface.tsx`
- Modify: `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx`
- Modify: `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx`
- Modify: `packages/plugins/plugin-sheet/src/capabilities/markdown.ts`
- Modify: `packages/plugins/plugin-assistant/src/capabilities/markdown.ts`
- Modify: `packages/plugins/plugin-thread/src/capabilities/markdown.ts`
- Modify: `packages/plugins/plugin-file/src/capabilities/markdown.ts`
- Modify: `packages/plugins/plugin-native-filesystem/src/capabilities/markdown.ts`
- Modify: `packages/plugins/plugin-mermaid/src/MermaidPlugin.tsx`
- Modify: `packages/plugins/plugin-meeting/src/containers/MeetingArticle/MeetingArticle.stories.tsx`
- Modify: `packages/plugins/plugin-mermaid/PLUGIN.mdl`
- Modify: `packages/plugins/plugin-sheet/PLUGIN.mdl`

- [ ] **Step 1: Rename the capability key in plugin-markdown**

  In `plugin-markdown/src/types/MarkdownCapabilities.ts` line 51:

  ```ts
  export const ExtensionProvider = Capability.make<MarkdownExtensionProvider[]>(`${meta.id}.capability.extensions`);
  ```

  Note: capability ID string kept as-is.

- [ ] **Step 2: Update all usages in plugin-markdown**

  ```bash
  grep -rn "MarkdownCapabilities\.Extensions\b" packages/plugins/plugin-markdown/src/
  ```

  Replace all with `MarkdownCapabilities.ExtensionProvider`.
  Key locations:
  - `src/capabilities/react-surface.tsx:104`
  - `src/containers/MarkdownArticle/MarkdownArticle.tsx:51`
  - `src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:48`

- [ ] **Step 3: Update all contributors**

  ```bash
  grep -rn "MarkdownCapabilities\.Extensions\b" packages/plugins/
  ```

  Update every `Capability.contributes(MarkdownCapabilities.ExtensionProvider, ...)` call in:
  - `plugin-sheet/src/capabilities/markdown.ts`
  - `plugin-assistant/src/capabilities/markdown.ts`
  - `plugin-thread/src/capabilities/markdown.ts`
  - `plugin-file/src/capabilities/markdown.ts`
  - `plugin-native-filesystem/src/capabilities/markdown.ts`
  - `plugin-mermaid/src/MermaidPlugin.tsx` (inline — will be extracted in Step 4)
  - `plugin-meeting/src/containers/MeetingArticle/MeetingArticle.stories.tsx`

- [ ] **Step 4: Update PLUGIN.mdl files**

  ```bash
  grep -rn "MarkdownCapabilities\.Extensions\b" packages/plugins/plugin-mermaid/PLUGIN.mdl packages/plugins/plugin-sheet/PLUGIN.mdl
  ```

  Replace all with `MarkdownCapabilities.ExtensionProvider`.

- [ ] **Step 5: Extract plugin-mermaid's inline contribution to `src/capabilities/markdown-extension.ts`**

  Create `packages/plugins/plugin-mermaid/src/capabilities/markdown-extension.ts`:

  ```ts
  //
  // Copyright 2023 DXOS.org
  //

  import * as Effect from 'effect/Effect';

  import { Capability } from '@dxos/app-framework';
  import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

  import { mermaid } from '../extensions';

  export default Capability.makeModule(() =>
    Effect.succeed(Capability.contributes(MarkdownCapabilities.ExtensionProvider, [mermaid])),
  );
  ```

  Create `packages/plugins/plugin-mermaid/src/capabilities/index.ts`:

  ```ts
  //
  // Copyright 2023 DXOS.org
  //

  import { Capability } from '@dxos/app-framework';
  import type { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

  export const MarkdownExtension: Capability.LazyCapability<
    void,
    Capability.Capability<typeof MarkdownCapabilities.ExtensionProvider>
  > = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
  ```

- [ ] **Step 6: Update MermaidPlugin.tsx to use the lazy capability**

  Replace the inline `Plugin.addModule` block:

  ```ts
  import { MarkdownExtension } from '#capabilities';
  import { MarkdownEvents } from '@dxos/plugin-markdown/types';

  // In Plugin.define(...).pipe():
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: MarkdownExtension,
  }),
  ```

- [ ] **Step 7: Add `#capabilities` alias and entrypoint to plugin-mermaid**

  In `package.json` `imports`:

  ```json
  "#capabilities": "./src/capabilities/index.ts"
  ```

  In `moon.yml` `compile.args`, add:

  ```yaml
  - '--entryPoint=src/capabilities/index.ts'
  ```

- [ ] **Step 8: Build and lint all affected plugins**

  ```bash
  moon run plugin-markdown:build plugin-sheet:build plugin-assistant:build plugin-thread:build plugin-file:build plugin-native-filesystem:build plugin-mermaid:build
  moon run plugin-markdown:lint plugin-mermaid:lint -- --fix
  ```

- [ ] **Step 9: Commit**

  ```bash
  git add packages/plugins/plugin-markdown packages/plugins/plugin-sheet packages/plugins/plugin-assistant packages/plugins/plugin-thread packages/plugins/plugin-file packages/plugins/plugin-native-filesystem packages/plugins/plugin-mermaid packages/plugins/plugin-meeting
  git commit -m "refactor(plugin-markdown): rename MarkdownCapabilities.Extensions → ExtensionProvider; extract mermaid inline contribution"
  ```

---

## Task 3b: Rename `CallsCapabilities.Extension` → `CallsCapabilities.EventHandler`

**Files to change:**

- Modify: `packages/plugins/plugin-calls/src/types/CallsCapabilities.ts`
- Modify: `packages/plugins/plugin-calls/PLUGIN.mdl`
- Modify: `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts`
- Modify: `packages/plugins/plugin-meeting/src/capabilities/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-meeting/src/capabilities/index.ts`
- Modify: `packages/plugins/plugin-meeting/src/operations/set-active.ts`

- [ ] **Step 1: Rename the key**

  In `plugin-calls/src/types/CallsCapabilities.ts` line 24:

  ```ts
  export const EventHandler = Capability.make<CallProperties>(`${meta.id}.capability.call-extension`);
  ```

  Capability ID string kept as-is.

- [ ] **Step 2: Find and update all references**

  ```bash
  grep -rn "CallsCapabilities\.Extension\b" packages/plugins/
  ```

  Replace every occurrence with `CallsCapabilities.EventHandler`.

- [ ] **Step 3: Update PLUGIN.mdl**

  ```bash
  grep -rn "CallsCapabilities\.Extension\b\|Extension\.on" packages/plugins/plugin-calls/PLUGIN.mdl
  ```

  Replace `CallsCapabilities.Extension` with `CallsCapabilities.EventHandler` throughout.
  Also update prose references from `Extension.onJoin`/`Extension.onLeave` etc. to `EventHandler.onJoin` etc.

- [ ] **Step 4: Build and lint**

  ```bash
  moon run plugin-calls:build plugin-meeting:build
  moon run plugin-calls:lint plugin-meeting:lint -- --fix
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/plugins/plugin-calls packages/plugins/plugin-meeting
  git commit -m "refactor(plugin-calls): rename CallsCapabilities.Extension → EventHandler"
  ```

---

## Task 4: Rename `TranscriptionCapabilities` keys and factory types

**Files to change:**

- Modify: `packages/plugins/plugin-transcription/src/types/TranscriptionCapabilities.ts`
- Modify: `packages/plugins/plugin-transcription/src/capabilities/transcriber.ts`
- Modify: `packages/plugins/plugin-transcription/src/hooks/useTranscriber.ts`
- Modify: `packages/plugins/plugin-transcription/src/stories/common.ts`
- Modify: `packages/plugins/plugin-meeting/src/capabilities/call-extension.ts`

Full rename map:

| Old                                | New                                        |
| ---------------------------------- | ------------------------------------------ |
| `GetTranscriberProps`              | `TranscriberProviderProps`                 |
| `GetTranscriber`                   | `TranscriberProvider` (type)               |
| `Transcriber` (const key)          | `TranscriberProvider` (const key)          |
| `GetTranscriptionManagerProps`     | `TranscriptionManagerProviderProps`        |
| `GetTranscriptionManager`          | `TranscriptionManagerProvider` (type)      |
| `TranscriptionManager` (const key) | `TranscriptionManagerProvider` (const key) |

Note: TypeScript allows a `type` and a `const` to share the same name (different declaration spaces), so `TranscriberProvider` as both the function type and the capability key is valid.

- [ ] **Step 1: Rewrite `TranscriptionCapabilities.ts`**

  ```ts
  export type TranscriberProviderProps = {
    audioStreamTrack: MediaStreamTrack;
    recorderConfig?: Partial<MediaStreamRecorderProps['config']>;
    transcriberConfig?: Partial<TranscriberProps['config']>;
    onSegments: TranscriberProps['onSegments'];
    transcribe?: TranscriberProps['transcribe'];
  };

  export type TranscriberProvider = (props: TranscriberProviderProps) => TranscriberType;

  export type TranscriptionManagerProviderProps = {
    messageEnricher?: TranscriptMessageEnricher;
  };

  export type TranscriptionManagerProvider = (props: TranscriptionManagerProviderProps) => TranscriptionManagerType;

  export const TranscriberProvider = Capability.make<TranscriberProvider>(`${meta.id}.capability.transcriber`);

  export const TranscriptionManagerProvider = Capability.make<TranscriptionManagerProvider>(
    `${meta.id}.capability.transcription-manager`,
  );
  ```

  Capability ID strings are kept as-is.

- [ ] **Step 2: Update `transcriber.ts` — type annotations and capability keys**

  Rename local variables to match the new type names and update `Capability.contributes` calls:

  ```ts
  const transcriberProvider: TranscriptionCapabilities.TranscriberProvider = ({
    audioStreamTrack, recorderConfig, transcriberConfig, onSegments, transcribe,
  }) => { ... };

  const transcriptionManagerProvider: TranscriptionCapabilities.TranscriptionManagerProvider = ({ messageEnricher }) => {
    ...
  };

  return [
    Capability.contributes(TranscriptionCapabilities.TranscriberProvider, transcriberProvider),
    Capability.contributes(TranscriptionCapabilities.TranscriptionManagerProvider, transcriptionManagerProvider),
  ];
  ```

- [ ] **Step 3: Update `useTranscriber.ts`**

  ```ts
  // Props type
  }: Partial<TranscriptionCapabilities.TranscriberProviderProps>) => {
  // Capability lookup
  const [transcriberProvider] = useCapabilities(TranscriptionCapabilities.TranscriberProvider);
  ```

- [ ] **Step 4: Update `stories/common.ts`**

  ```ts
  TranscriptionCapabilities.TranscriberProviderProps,
  ```

- [ ] **Step 5: Update `plugin-meeting/src/capabilities/call-extension.ts`**

  ```ts
  const transcriptionManagerProvider = await capabilities
    .get(TranscriptionCapabilities.TranscriptionManagerProvider)({})
    .open();
  ```

- [ ] **Step 6: Verify no remaining old names**

  ```bash
  grep -rn "GetTranscriber\|GetTranscriptionManager\|TranscriptionCapabilities\.Transcriber\b\|TranscriptionCapabilities\.TranscriptionManager\b" packages/plugins/
  ```

  Expected: zero results.

- [ ] **Step 7: Build and lint**

  ```bash
  moon run plugin-transcription:build plugin-meeting:build
  moon run plugin-transcription:lint plugin-meeting:lint -- --fix
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add packages/plugins/plugin-transcription packages/plugins/plugin-meeting
  git commit -m "refactor(plugin-transcription): normalize capability keys and factory types to Provider suffix"
  ```

---

## Task 5: Rename implementation files

### 5a: plugin-duffel — no rename needed

`DuffelPlugin.tsx` already uses `Plugin.addModule({ activate: Duffel })` with the lazy capability from `#capabilities` — the correct pattern. `duffel.ts` contributes both settings and `TripCapabilities.BookingService` together (they share the same credentials atom), so naming it `booking-service.ts` would be misleading. No changes required here.

### 5b: plugin-osrm — `osrm.ts` → `routing-service.ts`

- [ ] **Step 1: Rename the file**

  ```bash
  mv packages/plugins/plugin-osrm/src/capabilities/osrm.ts \
     packages/plugins/plugin-osrm/src/capabilities/routing-service.ts
  ```

- [ ] **Step 2: Update capabilities/index.ts**

  Change:

  ```ts
  export const Osrm: Capability.LazyCapability<...> = Capability.lazy('Osrm', () => import('./osrm'));
  ```

  To:

  ```ts
  export const RoutingService: Capability.LazyCapability<...> = Capability.lazy('RoutingService', () => import('./routing-service'));
  ```

- [ ] **Step 3: Update OsrmPlugin.tsx** to import `RoutingService` instead of `Osrm` from `#capabilities`.

- [ ] **Step 4: Build and lint**

  ```bash
  moon run plugin-osrm:build plugin-osrm:lint -- --fix
  ```

### 5c: Rename `markdown.ts` → `markdown-extension.ts` in the five existing contributors

For each of `plugin-sheet`, `plugin-assistant`, `plugin-thread`, `plugin-file`, `plugin-native-filesystem`:

- [ ] **Step 1: Rename the file in each plugin**

  ```bash
  for plugin in plugin-sheet plugin-assistant plugin-thread plugin-file plugin-native-filesystem; do
    mv packages/plugins/$plugin/src/capabilities/markdown.ts \
       packages/plugins/$plugin/src/capabilities/markdown-extension.ts
  done
  ```

- [ ] **Step 2: Update each capabilities/index.ts barrel**

  In each plugin's `src/capabilities/index.ts`, find the `Capability.lazy('Markdown', ...)` (or equivalent name) export and update:
  - the lazy label to `'MarkdownExtension'`
  - the import path to `./markdown-extension`

  Example (plugin-sheet):

  ```ts
  export const Markdown = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
  ```

  (Keep the exported const name `Markdown` if it is referenced by name elsewhere in the plugin, or rename consistently.)

- [ ] **Step 3: Build and lint all five**

  ```bash
  moon run plugin-sheet:build plugin-assistant:build plugin-thread:build plugin-file:build plugin-native-filesystem:build
  moon run plugin-sheet:lint plugin-assistant:lint plugin-thread:lint plugin-file:lint plugin-native-filesystem:lint -- --fix
  ```

- [ ] **Step 4: Commit tasks 5a–5c**

  ```bash
  git add packages/plugins/plugin-osrm packages/plugins/plugin-sheet packages/plugins/plugin-assistant packages/plugins/plugin-thread packages/plugins/plugin-file packages/plugins/plugin-native-filesystem
  git commit -m "refactor: rename capability implementation files to match capability names"
  ```

---

## Task 6: Update cross-plugin imports to use `./types` subpath

Importing from a plugin's root entrypoint pulls in its full barrel (hooks, meta, operations, components). Capability keys should be imported from `@dxos/plugin-X/types`.

**Files to update:**

| Plugin                                                       | Current import                      | New import                                |
| ------------------------------------------------------------ | ----------------------------------- | ----------------------------------------- |
| `plugin-chess` (capability key only)                         | `from '@dxos/plugin-game'`          | `from '@dxos/plugin-game/types'`          |
| `plugin-tictactoe` (capability key only)                     | `from '@dxos/plugin-game'`          | `from '@dxos/plugin-game/types'`          |
| `plugin-duffel` (capability key + types only)                | `from '@dxos/plugin-trip'`          | `from '@dxos/plugin-trip/types'`          |
| `plugin-osrm` (capability key + types only)                  | `from '@dxos/plugin-trip'`          | `from '@dxos/plugin-trip/types'`          |
| `plugin-meeting` (capability key only)                       | `from '@dxos/plugin-calls'`         | `from '@dxos/plugin-calls/types'`         |
| `plugin-meeting` (capability key only)                       | `from '@dxos/plugin-transcription'` | `from '@dxos/plugin-transcription/types'` |
| `plugin-sheet`, `plugin-mermaid`, etc. (capability key only) | `from '@dxos/plugin-markdown'`      | `from '@dxos/plugin-markdown/types'`      |

- [ ] **Step 1: Update plugin-chess and plugin-tictactoe**

  In each, split the import — capability-key imports use `/types`, everything else (meta, loadGame, GameVariantSurfaceProps, GameRef) uses root unless already available via `/types`:

  ```ts
  // Before: import { GameCapabilities, type GameVariant } from '@dxos/plugin-game';
  // After:
  import { GameCapabilities, type GameVariant } from '@dxos/plugin-game/types';
  ```

  Check `plugin-game/src/types/index.ts` to confirm `GameVariant`, `GameRef`, `loadGame`, `make` are all re-exported there.

- [ ] **Step 2: Update plugin-duffel and plugin-osrm**

  ```ts
  // Before: import { type BookingSearch, TripCapabilities } from '@dxos/plugin-trip';
  // After:
  import { type BookingSearch, TripCapabilities } from '@dxos/plugin-trip/types';
  ```

  Check all files under `src/capabilities/` and `src/services/`.

- [ ] **Step 3: Update plugin-meeting**

  Split `@dxos/plugin-calls` and `@dxos/plugin-transcription` imports to use `/types`.

- [ ] **Step 4: Update markdown extension contributors**

  In each of the capability files (now `markdown-extension.ts`) that imports `MarkdownCapabilities`:

  ```ts
  import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
  ```

- [ ] **Step 5: Build affected plugins**

  ```bash
  moon run plugin-chess:build plugin-tictactoe:build plugin-duffel:build plugin-osrm:build plugin-meeting:build plugin-sheet:build plugin-mermaid:build plugin-assistant:build plugin-thread:build plugin-file:build plugin-native-filesystem:build
  ```

- [ ] **Step 6: Lint**

  ```bash
  moon run plugin-chess:lint plugin-tictactoe:lint plugin-duffel:lint plugin-osrm:lint plugin-meeting:lint -- --fix
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add packages/plugins/plugin-chess packages/plugins/plugin-tictactoe packages/plugins/plugin-duffel packages/plugins/plugin-osrm packages/plugins/plugin-meeting packages/plugins/plugin-sheet packages/plugins/plugin-mermaid packages/plugins/plugin-assistant packages/plugins/plugin-thread packages/plugins/plugin-file packages/plugins/plugin-native-filesystem
  git commit -m "refactor: use ./types subpath imports for cross-plugin capability keys"
  ```

---

## Task 7: Update AUDIT.md

- [ ] **Step 1: Update `packages/plugins/AUDIT.md`**

  Apply the renamed capability keys and add plugin-mermaid (which was missing):

  ```markdown
  | Plugin                 | Namespace                   | Capability                     |
  | ---------------------- | --------------------------- | ------------------------------ |
  | `plugin-calls`         | `CallsCapabilities`         | `EventHandler`                 |
  | `plugin-game`          | `GameCapabilities`          | `VariantProvider`              |
  | `plugin-map`           | `MapCapabilities`           | `MarkerProvider`               |
  | `plugin-markdown`      | `MarkdownCapabilities`      | `ExtensionProvider`            |
  | `plugin-transcription` | `TranscriptionCapabilities` | `TranscriberProvider`          |
  | `plugin-transcription` | `TranscriptionCapabilities` | `TranscriptionManagerProvider` |
  | `plugin-trip`          | `TripCapabilities`          | `BookingService`               |
  | `plugin-trip`          | `TripCapabilities`          | `RoutingService`               |
  ```

  Note: plugin-mermaid was previously missing from the `MarkdownCapabilities.ExtensionProvider` contributor list; it's now properly included via the extracted capability file from Task 3.

- [ ] **Step 2: Commit**

  ```bash
  git add packages/plugins/AUDIT.md
  git commit -m "docs(plugins): update AUDIT.md with normalized capability names"
  ```

---

## Task 8: Update composer-plugins skill

Add a **Cross-plugin capabilities** section to `.agents/skills/composer-plugins/SKILL.md` documenting the pattern.

- [ ] **Step 1: Insert section after the `### Capability` section**

  Add the following content after line `See: plugin-chess/src/capabilities/`:

  ````markdown
  #### Cross-plugin capabilities (`src/types/XCapabilities.ts`)

  Some plugins expose capability keys for other plugins to implement — a decoupled provider/extension
  contract. See `packages/plugins/AUDIT.md` for the current registry.

  **Naming convention** — use one of three suffixes depending on the role:

  | Suffix         | Use when                                                             | Example                                                                                                        |
  | -------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
  | `Provider`     | The contributor supplies data, a factory, or an array of extensions  | `MapCapabilities.MarkerProvider`, `GameCapabilities.VariantProvider`, `MarkdownCapabilities.ExtensionProvider` |
  | `Service`      | The contributor performs active async work (search, routing, …)      | `TripCapabilities.BookingService`, `TripCapabilities.RoutingService`                                           |
  | `EventHandler` | The contributor registers callbacks for host-plugin lifecycle events | `CallsCapabilities.EventHandler`                                                                               |

  **Where to define** — add the `Capability.make<T>()` call in the defining plugin's
  `src/types/XCapabilities.ts`, namespace-exported from `src/types/index.ts`:

  ```ts
  // packages/plugins/plugin-foo/src/types/FooCapabilities.ts
  export const BarProvider = Capability.make<BarProvider>(`${meta.id}.capability.bar-provider`);
  ```
  ````

  Expose it via a `./types` subpath in `package.json` (see plugin-game as a reference). Add the
  matching `--entryPoint=src/types/index.ts` in `moon.yml` if not already present.

  **Where to implement** — the donor plugin places its contribution in a dedicated file in
  `src/capabilities/`, named after the capability it implements (e.g. `booking-service.ts`,
  `routing-service.ts`, `markdown-extension.ts`). Wire it via `Capability.lazy` in
  `src/capabilities/index.ts`.

  **How to import the key** — use the `/types` subpath, not the root entrypoint:

  ```ts
  // ✓
  import { FooCapabilities } from '@dxos/plugin-foo/types';
  // ✗ — pulls in the full barrel (meta, hooks, operations, …)
  import { FooCapabilities } from '@dxos/plugin-foo';
  ```

  **Reference implementations:**
  - Provider pattern: `plugin-osrm/src/capabilities/routing-service.ts` (implements `TripCapabilities.RoutingService`)
  - Enumeration pattern: `plugin-chess/src/capabilities/game-variant.ts` (implements `GameCapabilities.VariantProvider`)
  - EventHandler pattern: `plugin-meeting/src/capabilities/call-extension.ts` (implements `CallsCapabilities.EventHandler`)

- [ ] **Step 2: Build lint check (skill is Markdown, just verify file is well-formed)**

  ```bash
  head -5 .agents/skills/composer-plugins/SKILL.md
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add .agents/skills/composer-plugins/SKILL.md
  git commit -m "docs(composer-plugins): document cross-plugin capability naming and structure"
  ```
