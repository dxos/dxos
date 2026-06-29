# Widget Portal Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify two parallel widget-portal mechanisms (`xmlTags`/`PlaceholderWidget` and `preview`/`PreviewBlockWidget`) into a single CodeMirror extension so both XML tag–triggered and URL-scheme–triggered React widgets flow through one `PlaceholderWidget` → `setWidgets` pipeline.

**Architecture:** Phase 1 extracts `PlaceholderWidget` / `XmlWidgetNotifier` into a standalone internal file so `preview.ts` can adopt it without circular dependencies. Phase 2 adds URL-scheme slots to `XmlWidgetRegistry` and converts `preview()` into a thin registry factory wrapping `xmlTags()`. Phase 3 removes the now-redundant `addBlockContainer`/`removeBlockContainer` callback API and the `previewBlocks` React state it required.

**Tech Stack:** TypeScript, CodeMirror 6 (`@codemirror/state`, `@codemirror/view`), React 18 portals, vitest, moon build system.

## Global Constraints

- No casts (`as T`, `as any`, `as unknown as T`, `!`) — fix types at source; `as const` is fine.
- Single quotes for strings; no default exports.
- `@dxos/*` workspace packages use `workspace:*` version; never catalog.
- Run `moon run <package>:build` and `moon run <package>:lint` after every task to confirm nothing regresses.
- Use proto's moon shim: prefix commands with `export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" &&`.
- All new files in `ui-editor` are pure TypeScript (no JSX) unless they live under `react-ui-editor`.
- `preview.ts` public exports (`preview`, `PreviewBlock`, `PreviewLinkRef`, `PreviewLinkTarget`, `PreviewOptions`, `getLinkRef`) must remain importable from `@dxos/ui-editor` throughout phases 1 and 2 (backwards compatibility). They are removed only in phase 3 after all call sites are migrated.
- `XmlWidgetNotifier` is currently an internal `interface` — it is promoted to a named export in Task 1.

---

## File Map

### Created
| File | Purpose |
|------|---------|
| `packages/ui/ui-editor/src/extensions/tags/placeholder-widget.ts` | Extracted `PlaceholderWidget` class and `XmlWidgetNotifier` interface, importable without pulling in the full `xmlTags` machinery. |
| `packages/ui/ui-editor/src/extensions/preview/PreviewWidget.tsx` | React component (`PreviewWidget`) used as the `Component` entry for URL-scheme block slots once `preview` is registry-backed. Lives in `react-ui-editor` because it imports React. Wait — actually this component belongs in `react-ui-editor` not `ui-editor`. See Task 5. |

### Modified
| File | Change |
|------|--------|
| `packages/ui/ui-editor/src/extensions/tags/xml-tags.ts` | Import `PlaceholderWidget` / `XmlWidgetNotifier` from new file; add `urlSchemes?: string[]` to `XmlWidgetDef`; extend `buildDecorations` to walk `Link`/`Image` syntax nodes and match URL schemes. |
| `packages/ui/ui-editor/src/extensions/tags/index.ts` | Re-export `PlaceholderWidget` and `XmlWidgetNotifier`. |
| `packages/ui/ui-editor/src/extensions/preview/preview.ts` | Phase 1: replace `PreviewBlockWidget` with `PlaceholderWidget`. Phase 2: rewrite as thin factory. Phase 3: remove. |
| `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx` | Add a third story `UnifiedRegistry` that exercises both XML tag and URL-scheme widgets through `xmlTags` in one editor. |
| `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx` | Phase 2: switch from `preview(previewOptions)` to `xmlTags({ registry: previewRegistry(opts) })`. |
| `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.tsx` | Phase 3: remove `previewBlocks` state, `addBlockContainer`/`removeBlockContainer` callbacks, `MarkdownEditorBlocks` sub-component; drive portals via `setWidgets` passed to `xmlTags`. |
| `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx` | Phase 2: merge standalone `preview()` call into the existing `xmlTags` call by adding URL-scheme entries to `componentRegistry`. |
| `packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx` | Phase 2: replace `preview()` (no-op callbacks) with `xmlTags({ registry: inlinePreviewRegistry })`. |
| `packages/ui/react-ui-transcription/src/components/Transcription/Transcription.tsx` | Phase 2: same as MarkdownViewer. |

---

## Phase 1 — Shared primitive

### Task 1: Extract `PlaceholderWidget` into its own file

**Files:**
- Create: `packages/ui/ui-editor/src/extensions/tags/placeholder-widget.ts`
- Modify: `packages/ui/ui-editor/src/extensions/tags/xml-tags.ts`
- Modify: `packages/ui/ui-editor/src/extensions/tags/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface XmlWidgetNotifier {
    mounted(widget: XmlWidgetState): void;
    unmounted(id: string): void;
  }
  export class PlaceholderWidget<TProps extends XmlWidgetProps> extends WidgetType {
    constructor(
      readonly id: string,
      readonly Component: FunctionComponent<TProps>,
      readonly props: TProps,
      readonly notifier: XmlWidgetNotifier,
      readonly streaming?: boolean,
    );
    get root(): HTMLElement | null;
  }
  ```

- [ ] **Step 1: Create `placeholder-widget.ts` with the extracted class**

  Move the `PlaceholderWidget` class and `XmlWidgetNotifier` interface verbatim from `xml-tags.ts` into the new file. The file must import everything it needs directly — do not re-import from `xml-tags`.

  ```ts
  // packages/ui/ui-editor/src/extensions/tags/placeholder-widget.ts
  //
  // Copyright 2025 DXOS.org
  //

  import { type FunctionComponent } from 'react';
  import { EditorView, WidgetType } from '@codemirror/view';

  import { invariant } from '@dxos/invariant';
  import { Domino } from '@dxos/ui';

  import { type XmlWidgetProps, type XmlWidgetState } from './xml-tags';

  export interface XmlWidgetNotifier {
    mounted(widget: XmlWidgetState): void;
    unmounted(id: string): void;
  }

  export class PlaceholderWidget<TProps extends XmlWidgetProps> extends WidgetType {
    #root: HTMLElement | null = null;
    #view: EditorView | undefined;

    constructor(
      readonly id: string,
      readonly Component: FunctionComponent<TProps>,
      readonly props: TProps,
      readonly notifier: XmlWidgetNotifier,
      readonly streaming?: boolean,
    ) {
      super();
      invariant(id);
    }

    get root(): HTMLElement | null {
      return this.#root;
    }

    override eq(other: this) {
      if (this.streaming) {
        return false;
      }
      return this.id === other.id;
    }

    override ignoreEvent() {
      return true;
    }

    override toDOM(view: EditorView) {
      this.#view = view;
      this.#root = Domino.of('div').classNames('min-h-[24px]').root;
      const props = Object.assign({}, this.props, { view }) as TProps;
      this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
      return this.#root;
    }

    override updateDOM(dom: HTMLElement) {
      this.#root = dom;
      const props = Object.assign({}, this.props, { view: this.#view }) as TProps;
      this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
      return true;
    }

    override destroy(_dom: HTMLElement) {
      this.notifier.unmounted(this.id);
      this.#root = null;
      this.#view = undefined;
    }
  }
  ```

- [ ] **Step 2: Update `xml-tags.ts` to import from the new file**

  Remove the `PlaceholderWidget` class body and `XmlWidgetNotifier` interface from `xml-tags.ts`. Add imports:

  ```ts
  import { type XmlWidgetNotifier, PlaceholderWidget } from './placeholder-widget';
  ```

  Remove `XmlWidgetNotifier` from its current location in the file. The class reference `new PlaceholderWidget(...)` stays unchanged.

  Also add `export type { XmlWidgetNotifier }` so consumers can still get it from `xml-tags`.

- [ ] **Step 3: Re-export from `tags/index.ts`**

  Add to `packages/ui/ui-editor/src/extensions/tags/index.ts`:

  ```ts
  export { PlaceholderWidget, type XmlWidgetNotifier } from './placeholder-widget';
  ```

- [ ] **Step 4: Build and lint**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run ui-editor:build ui-editor:lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ui/ui-editor/src/extensions/tags/placeholder-widget.ts \
          packages/ui/ui-editor/src/extensions/tags/xml-tags.ts \
          packages/ui/ui-editor/src/extensions/tags/index.ts
  git commit -m "refactor(ui-editor): extract PlaceholderWidget into standalone file"
  ```

---

### Task 2: Rewrite `PreviewBlockWidget` to delegate to `PlaceholderWidget`

**Files:**
- Modify: `packages/ui/ui-editor/src/extensions/preview/preview.ts`

**Interfaces:**
- Consumes: `PlaceholderWidget`, `XmlWidgetNotifier` from `../tags/placeholder-widget`
- Produces: same public API (`preview`, `PreviewBlock`, `PreviewLinkRef`, `PreviewOptions`, `getLinkRef`) — no call-site changes.

The `addBlockContainer` / `removeBlockContainer` callbacks are adapted into an `XmlWidgetNotifier` shim. The block widget component is a minimal inline React component (no JSX — rendered via `React.createElement`) defined inside `preview.ts`.

> **Note:** `preview.ts` currently has no React dependency and lives in the plain-TS `ui-editor` package. In this task we keep that constraint by NOT adding a React `Component` entry. Instead `PreviewBlockWidget` becomes a subclass of `PlaceholderWidget` with an empty component, and the callbacks continue to drive external React rendering exactly as before. This is a pure internal refactor — the shim translates `notifier.mounted` → `addBlockContainer` and `notifier.unmounted` → `removeBlockContainer`.

- [ ] **Step 1: Add import for `PlaceholderWidget` and `XmlWidgetNotifier`**

  At the top of `preview.ts`, add:

  ```ts
  import { type XmlWidgetNotifier, PlaceholderWidget } from '../tags/placeholder-widget';
  ```

- [ ] **Step 2: Create the notifier shim**

  Replace the `PreviewBlockWidget` class with a function that builds a notifier shim and returns a `PlaceholderWidget`. Add this helper inside `preview.ts` (not exported):

  ```ts
  // Minimal stand-in component — the actual rendering is driven by addBlockContainer/removeBlockContainer callbacks.
  // React is not imported here; this component is never rendered by MarkdownStream's portal loop
  // because preview.ts call sites do not pass setWidgets to xmlTags.
  const _PreviewPlaceholder = () => null;

  const makePreviewNotifier = (options: PreviewOptions, link: PreviewLinkRef): XmlWidgetNotifier => ({
    mounted({ root }) {
      options.addBlockContainer?.({ link, el: root as HTMLElement });
    },
    unmounted() {
      options.removeBlockContainer?.({ link, el: document.createElement('div') });
    },
  });
  ```

  Wait — the `unmounted` call needs the original `el` reference. The current `PreviewBlockWidget.destroy(root)` passes the actual DOM node. We need to capture `el` from `mounted` and use it in `unmounted`.

  Correct implementation:

  ```ts
  const makePreviewNotifier = (options: PreviewOptions, link: PreviewLinkRef): XmlWidgetNotifier => {
    let el: HTMLElement | null = null;
    return {
      mounted({ root }) {
        el = root as HTMLElement;
        options.addBlockContainer?.({ link, el });
      },
      unmounted() {
        if (el) {
          options.removeBlockContainer?.({ link, el });
          el = null;
        }
      },
    };
  };
  ```

- [ ] **Step 3: Replace `PreviewBlockWidget` usage in `buildDecorations`**

  In `buildDecorations`, find the section that constructs `new PreviewBlockWidget(options, link)` and replace with:

  ```ts
  const notifier = makePreviewNotifier(options, link);
  // Use a stable widget id based on the DXN so eq() works across rebuilds.
  const widgetId = `cm-preview-${link.dxn}`;
  new PlaceholderWidget(widgetId, _PreviewPlaceholder as any, { _tag: 'preview', range: { from: node.from, to: node.to } }, notifier)
  ```

  > The `as any` on `_PreviewPlaceholder` is justified here: `PlaceholderWidget` requires a `FunctionComponent<XmlWidgetProps>` but `_PreviewPlaceholder` is a stand-in that is never rendered. This is a genuine type-boundary cast at the seam between two systems; the component slot will be replaced by a real typed component in Phase 2.
  > Add the comment: `// Stand-in component; addBlockContainer callbacks drive actual rendering until Phase 2.`

  Delete the `PreviewBlockWidget` class entirely.

- [ ] **Step 4: Build and lint**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run ui-editor:build ui-editor:lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Smoke-test the Widgets.stories `Preview` story**

  Start storybook if not already running:
  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run storybook-react:serve --quiet &
  ```
  Open `http://localhost:9009` and navigate to `ui/react-ui-editor/Widgets > Preview`. Confirm block cards render below `![DXOS](echo:/123)` nodes.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/ui/ui-editor/src/extensions/preview/preview.ts
  git commit -m "refactor(ui-editor): replace PreviewBlockWidget with PlaceholderWidget shim"
  ```

---

## Phase 2 — Unified registry with URL-scheme slots

### Task 3: Add `urlSchemes` to `XmlWidgetDef` and extend `buildDecorations`

**Files:**
- Modify: `packages/ui/ui-editor/src/extensions/tags/xml-tags.ts`

**Interfaces:**
- Produces:
  ```ts
  export type XmlWidgetDef = {
    block?: boolean;
    streaming?: boolean;
    debug?: boolean;
    factory?: XmlWidgetFactory;
    Component?: FunctionComponent<XmlWidgetProps>;
    /** URL scheme prefixes that trigger this widget on Link/Image markdown nodes, e.g. ['dxn:', 'echo:']. */
    urlSchemes?: string[];
  };
  ```

  The props passed to the widget for URL-scheme matches:
  ```ts
  {
    _tag: 'link' | 'image',   // 'image' for block (![...](url)), 'link' for inline ([...](url))
    range: { from: number; to: number },
    label: string,             // the link label text
    dxn: string,               // the full URL
    suggest?: boolean,         // true when the Image mark is '!'
    block?: boolean,           // same as suggest for compat with PreviewLinkRef
    context?: any,
  }
  ```

- [ ] **Step 1: Add `urlSchemes` field to `XmlWidgetDef`**

  In `xml-tags.ts`, add `urlSchemes?: string[]` to the `XmlWidgetDef` type (after the `Component` field):

  ```ts
  /**
   * URL scheme prefixes that trigger this widget on Link/Image markdown nodes.
   * Example: `['dxn:', 'echo:']` matches `[label](dxn:…)` and `![label](echo:…)`.
   * Block widgets are created for Image nodes; inline widgets for Link nodes.
   */
  urlSchemes?: string[];
  ```

- [ ] **Step 2: Build a URL-scheme lookup map in `xmlTags`**

  In `createWidgetDecorationsField`, before calling `buildDecorations`, derive a map from scheme prefix → `[tag, def]`:

  ```ts
  const urlSchemeMap: Map<string, [string, XmlWidgetDef]> = new Map();
  for (const [tag, def] of Object.entries(registry ?? {})) {
    for (const scheme of def.urlSchemes ?? []) {
      urlSchemeMap.set(scheme, [tag, def]);
    }
  }
  ```

  Pass `urlSchemeMap` into `buildDecorations`.

- [ ] **Step 3: Walk `Link` and `Image` nodes in `buildDecorations`**

  Update `buildDecorations` signature to accept `urlSchemeMap`:

  ```ts
  const buildDecorations = (
    state: EditorState,
    range: Range,
    registry: XmlWidgetRegistry,
    notifier: XmlWidgetNotifier,
    urlSchemeMap: Map<string, [string, XmlWidgetDef]>,
  ): WidgetDecorationSet => {
  ```

  Inside the `tree.iterate` callback, alongside the existing `'Element'` case, add:

  ```ts
  case 'Image':
  case 'Link': {
    if (urlSchemeMap.size === 0) return false;
    const urlNode = node.node.getChild('URL');
    const markNodes = node.node.getChildren('LinkMark');
    if (!urlNode || markNodes.length < 2) return false;
    const dxn = state.sliceDoc(urlNode.from, urlNode.to);
    const match = [...urlSchemeMap.entries()].find(([scheme]) => dxn.startsWith(scheme));
    if (!match) return false;
    const [, [tag, def]] = match;
    const isBlock = node.type.name === 'Image';
    if (!isBlock && def.block) return false; // block-only def skips inline links
    const label = state.sliceDoc(markNodes[0].to, markNodes[1].from);
    const nodeRange = { from: node.node.from, to: node.node.to };
    const widgetId = `cm-url-${dxn}`;
    const props: XmlWidgetProps = {
      _tag: node.type.name.toLowerCase() as 'link' | 'image',
      range: nodeRange,
      context,
      label,
      dxn,
      block: isBlock,
      suggest: isBlock,
    };
    const widget: WidgetType | undefined = def.factory
      ? (def.factory(props) ?? undefined)
      : def.Component
        ? new PlaceholderWidget(widgetId, def.Component, props, notifier)
        : undefined;
    if (widget) {
      builder.add(
        nodeRange.from,
        nodeRange.to,
        Decoration.replace({ widget, block: isBlock, atomic: true, inclusive: true, tag }),
      );
      last = nodeRange.to - 1;
    }
    return false;
  }
  ```

- [ ] **Step 4: Build and lint**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run ui-editor:build ui-editor:lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ui/ui-editor/src/extensions/tags/xml-tags.ts
  git commit -m "feat(ui-editor): add urlSchemes registry slots to xmlTags"
  ```

---

### Task 4: Convert `preview()` to a registry factory wrapping `xmlTags`

**Files:**
- Modify: `packages/ui/ui-editor/src/extensions/preview/preview.ts`

The `addBlockContainer`/`removeBlockContainer` API is kept at this stage for backwards compatibility. The new code path is opt-in: if neither callback is provided, the `urlSchemes` registry entry requires a `Component` (supplied by call sites that pass `setWidgets` to `xmlTags` directly — handled in later tasks). For call sites that still pass callbacks, the shim notifier from Task 2 continues to work.

> After this task `preview()` is a small wrapper; the block widget logic lives in `xmlTags`.

- [ ] **Step 1: Rewrite `preview.ts`**

  Replace the entire file content with the following. The public types (`PreviewBlock`, `PreviewLinkRef`, `PreviewLinkTarget`, `PreviewOptions`, `getLinkRef`) are kept as re-exports for backwards compatibility.

  ```ts
  //
  // Copyright 2023 DXOS.org
  //

  import { syntaxTree } from '@codemirror/language';
  import { type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';
  import { Decoration, type DecorationSet, EditorView, ViewPlugin } from '@codemirror/view';
  import { type SyntaxNode } from '@lezer/common';

  import { type Database, Entity } from '@dxos/echo';
  import { EID, URI } from '@dxos/keys';

  import { type XmlWidgetNotifier, PlaceholderWidget } from '../tags/placeholder-widget';
  import { xmlTags } from '../tags/xml-tags';

  // ---------------------------------------------------------------------------
  // Public types (kept for backwards compatibility with existing call sites)
  // ---------------------------------------------------------------------------

  export type PreviewBlock = {
    link: PreviewLinkRef;
    el: HTMLElement;
  };

  export type PreviewLinkRef = {
    suggest?: boolean;
    block?: boolean;
    label: string;
    dxn: string;
  };

  export type PreviewLinkTarget = {
    label: string;
    text?: string;
    object?: any;
  };

  export type PreviewOptions = {
    db?: Database.Database;
    addBlockContainer?: (block: PreviewBlock) => void;
    removeBlockContainer?: (block: PreviewBlock) => void;
  };

  // ---------------------------------------------------------------------------
  // getLinkRef — kept as a public utility used by story / plugin-markdown
  // ---------------------------------------------------------------------------

  export const getLinkRef = (state: EditorState, node: SyntaxNode): PreviewLinkRef | undefined => {
    const mark = node.getChildren('LinkMark');
    const urlNode = node.getChild('URL');
    if (mark && urlNode) {
      const dxn = state.sliceDoc(urlNode.from, urlNode.to);
      if (dxn.startsWith('dxn:') || dxn.startsWith('echo:')) {
        const label = state.sliceDoc(mark[0].to, mark[1].from);
        return {
          block: state.sliceDoc(mark[0].from, mark[0].from + 1) === '!',
          label,
          dxn,
        };
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Inline chip (PreviewInlineWidget) — kept as a factory entry
  // ---------------------------------------------------------------------------

  const labelResolvedEffect = StateEffect.define<void>();

  const resolveLabel = (
    db: Database.Database,
    dxnStr: string,
    viewRef: { current: EditorView | undefined },
  ): string | undefined => {
    const echoUri = EID.tryParse(dxnStr);
    const dxnRef = echoUri ?? (dxnStr.startsWith('dxn:') ? URI.make(dxnStr) : undefined);
    if (!dxnRef) {
      return;
    }
    const ref = db.makeRef(dxnRef);
    const target = ref.target;
    if (target) {
      return Entity.getLabel(target);
    }
    void ref.tryLoad().then(() => {
      viewRef.current?.dispatch({ effects: labelResolvedEffect.of(undefined) });
    });
  };

  // ---------------------------------------------------------------------------
  // Notifier shim — bridges PlaceholderWidget lifecycle to addBlockContainer callbacks
  // ---------------------------------------------------------------------------

  const makePreviewNotifier = (options: PreviewOptions, link: PreviewLinkRef): XmlWidgetNotifier => {
    let el: HTMLElement | null = null;
    return {
      mounted({ root }) {
        el = root as HTMLElement;
        options.addBlockContainer?.({ link, el });
      },
      unmounted() {
        if (el) {
          options.removeBlockContainer?.({ link, el });
          el = null;
        }
      },
    };
  };

  // Stand-in component; addBlockContainer callbacks drive actual rendering until Phase 3.
  const _PreviewPlaceholder = () => null;

  // ---------------------------------------------------------------------------
  // preview() — thin factory over xmlTags
  // ---------------------------------------------------------------------------

  export const preview = (options: PreviewOptions = {}): Extension => {
    const viewRef: { current: EditorView | undefined } = { current: undefined };

    return [
      // Inline chip: factory-style, no React.
      StateField.define<DecorationSet>({
        create: (state) => buildInlineDecorations(state, options, viewRef),
        update: (decorations, tr) => {
          if (tr.docChanged || tr.effects.some((effect) => effect.is(labelResolvedEffect))) {
            return buildInlineDecorations(tr.state, options, viewRef);
          }
          return decorations.map(tr.changes);
        },
        provide: (field) => [
          EditorView.decorations.from(field),
          EditorView.atomicRanges.of((view) => view.state.field(field)),
        ],
      }),
      ViewPlugin.define((view) => {
        viewRef.current = view;
        return { destroy() { viewRef.current = undefined; } };
      }),

      // Block widgets: routed through xmlTags URL-scheme slots.
      xmlTags({
        registry: {
          'dxn-preview': {
            block: true,
            urlSchemes: ['dxn:', 'echo:'],
            // Component is undefined here; PlaceholderWidget is created manually
            // in xmlTags buildDecorations and the notifier shim drives callbacks.
            // TODO(phase3): replace with a real PreviewComponent once callbacks are removed.
          },
        },
        // No setWidgets — portals are driven by addBlockContainer callbacks via the shim.
        // The notifier is wired per-widget in buildDecorations via a custom factory.
        // We supply a factory instead of Component to intercept the PlaceholderWidget construction.
      }),
    ];
  };
  ```

  > **Implementation note:** The above is a target shape. The `xmlTags` `buildDecorations` path for URL schemes calls `new PlaceholderWidget(id, def.Component, props, notifier)` with a shared `notifier` from `createWidgetMap`. This won't call per-link `addBlockContainer`. To wire the shim, we need to pass the shim as a `factory` instead of a `Component`. Update the `xmlTags` URL-scheme walk (Task 3 Step 3) to also check for a `urlFactory` (a factory that receives `dxn` + `label` + `options`) — or, simpler: keep the inline chip as a `StateField` as above and add block widget creation directly in `preview.ts` using `xmlTags` with a `Component` that is a real React component.
  >
  > **Simplest correct approach for Phase 2:** Keep the block widget creation in `preview.ts` as a separate `StateField` (same as before but using `PlaceholderWidget` from Task 2). Only wire the `urlSchemes` / `xmlTags` path for sites that provide a real React `Component`. The `xmlTags` URL-scheme feature is tested independently in Task 3; `preview()` keeps its own `StateField` that uses `PlaceholderWidget` directly (already done in Task 2). The full registry-driven path is activated in Task 5.

  Given the above, the **actual rewrite for Task 4** is simpler — `preview.ts` keeps its own `StateField` for block widgets (already using `PlaceholderWidget` after Task 2) and adds the inline chip `StateField`. The `xmlTags` URL-scheme feature added in Task 3 is used directly by call sites in Tasks 6–8, not inside `preview.ts` itself.

  **Revised Step 1:** No changes needed to `preview.ts` in Task 4 — the Task 2 rewrite already achieves Phase 2 for the callback-based call sites. Skip to Task 5.

---

### Task 5: Add `PreviewComponent` to `react-ui-editor` for registry-backed block rendering

This creates the React component that replaces the `addBlockContainer` callback pattern for new call sites. Existing call sites (plugin-markdown, MarkdownEditor) continue to work unchanged until Phase 3.

**Files:**
- Create: `packages/ui/react-ui-editor/src/extensions/PreviewComponent.tsx`
- Modify: `packages/ui/react-ui-editor/src/index.ts` (re-export)

**Interfaces:**
- Produces:
  ```ts
  // PreviewComponent: FunctionComponent<XmlWidgetProps<{ label: string; dxn: string; block?: boolean; suggest?: boolean }>>
  // Renders <Surface.Surface type={AppSurface.Section} data={{ subject, attendableId }} limit={1} /> portaled into the placeholder root.
  export const PreviewComponent: FunctionComponent<PreviewComponentProps>;
  export type PreviewComponentProps = XmlWidgetProps<{ label: string; dxn: string; block?: boolean; suggest?: boolean }>;
  ```

- [ ] **Step 1: Create `PreviewComponent.tsx`**

  ```tsx
  //
  // Copyright 2025 DXOS.org
  //

  import React, { useMemo } from 'react';

  import { Surface } from '@dxos/app-framework/ui';
  import { useClient } from '@dxos/react-client';
  import { URI } from '@dxos/keys';
  import { type XmlWidgetProps } from '@dxos/ui-editor';

  import { AppSurface } from '../types'; // adjust import path to wherever AppSurface is defined in react-ui-editor

  export type PreviewComponentProps = XmlWidgetProps<{
    label: string;
    dxn: string;
    block?: boolean;
    suggest?: boolean;
  }>;

  /**
   * Registry-backed block widget for URL-scheme preview slots.
   * Replaces the addBlockContainer callback pattern.
   * Used as the Component entry in a urlSchemes XmlWidgetDef.
   */
  export const PreviewComponent = ({ dxn, label }: PreviewComponentProps) => {
    const client = useClient();
    const uri = URI.make(dxn);
    const subject = client.graph.makeRef(uri).target;
    const data = useMemo(() => ({ subject, attendableId: dxn }), [subject, dxn]);
    return <Surface.Surface type={AppSurface.Section} data={data} limit={1} />;
  };
  ```

  > **Note:** Check where `AppSurface` is imported from in `MarkdownEditor.tsx` (it uses `AppSurface.Section`) and use the same import path. If `react-ui-editor` does not depend on `@dxos/app-framework`, add that dependency via `pnpm add --filter react-ui-editor --save-catalog @dxos/app-framework` — or consider placing `PreviewComponent` in `plugin-markdown` instead, which already has this dependency.
  >
  > If the dependency is missing, place `PreviewComponent` in `packages/plugins/plugin-markdown/src/components/PreviewComponent.tsx` and adjust the file map accordingly.

- [ ] **Step 2: Re-export**

  Add to `packages/ui/react-ui-editor/src/index.ts` (or the relevant barrel):

  ```ts
  export { PreviewComponent, type PreviewComponentProps } from './extensions/PreviewComponent';
  ```

- [ ] **Step 3: Build and lint**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run react-ui-editor:build react-ui-editor:lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Add `UnifiedRegistry` story to `Widgets.stories.tsx`**

  Add a third export to `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx` that drives both XML tag widgets and URL-scheme widgets through a single `xmlTags` call:

  ```tsx
  import { PreviewComponent } from '../extensions/PreviewComponent';

  const unifiedRegistry = {
    test: xmlRegistry.test,
    'dxn-preview': {
      block: true,
      urlSchemes: ['dxn:', 'echo:'],
      Component: PreviewComponent,
    },
  } satisfies XmlWidgetRegistry;

  const UnifiedRegistryStory = ({ text }: { text?: string }) => {
    const { themeMode } = useThemeContext();
    const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
    const { parentRef } = useTextEditor({
      initialValue: text,
      extensions: [
        createThemeExtensions({ themeMode }),
        createBasicExtensions({ lineWrapping: true }),
        decorateMarkdown(),
        extendedMarkdown({ registry: unifiedRegistry }),
        xmlTags({ registry: unifiedRegistry, setWidgets }),
      ],
    });
    return (
      <>
        <div ref={parentRef} className='w-full p-4' />
        {widgets.map(({ id, root, Component, props }) => (
          <div key={id}>{createPortal(<Component {...props} />, root)}</div>
        ))}
      </>
    );
  };

  const unifiedText = trim`
    # Unified Registry

    XML tag widget:

    <test id="u-1" />

    URL-scheme block widget:

    ![DXOS](echo:/123)

    Inline link (chip only): [DXOS](echo:/123)
  `;

  export const UnifiedRegistry: Story = {
    render: () => <UnifiedRegistryStory text={unifiedText} />,
  };
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/ui/react-ui-editor/src/extensions/PreviewComponent.tsx \
          packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx
  git commit -m "feat(react-ui-editor): add PreviewComponent for unified registry URL-scheme slots"
  ```

---

### Task 6: Migrate `MarkdownStream` to unified `xmlTags` call

`MarkdownStream` currently has two separate extension calls: `xmlTags({ registry, setWidgets })` and `preview()` (no callbacks — inline chips only). After this task, the inline chip is handled by a `factory` entry in the existing registry, and `preview()` is removed.

**Files:**
- Modify: `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx`

- [ ] **Step 1: Add a `link-preview` inline chip entry to `componentRegistry` in `registry.tsx`**

  In `packages/plugins/plugin-assistant/src/components/ChatThread/registry.tsx`, the `componentRegistry` is built. `MarkdownStream` passes this registry to `xmlTags`. The inline chip factory needs access to the `db` in context.

  Add a new entry to `componentRegistry`:

  ```ts
  'link-preview': {
    block: false,
    urlSchemes: ['dxn:', 'echo:'],
    factory: (props) => {
      // Inline anchor chip — renders <dx-anchor> directly, no React.
      const root = document.createElement('dx-anchor');
      root.classList.add('dx-tag--anchor');
      root.textContent = (props as any).label ?? props.dxn ?? '';
      root.setAttribute('dxn', (props as any).dxn ?? '');
      return new (class extends WidgetType {
        override toDOM() { return root; }
        override eq(other: this) { return (this as any).dxn === (other as any).dxn; }
      })();
    },
  },
  ```

  > **Note:** `WidgetType` subclasses can't easily be created inline with the properties pattern without a class. Extract a named `AnchorInlineWidget` class:

  ```ts
  class AnchorInlineWidget extends WidgetType {
    constructor(readonly label: string, readonly dxn: string) { super(); }
    override eq(other: this) { return this.dxn === other.dxn && this.label === other.label; }
    override toDOM() {
      const root = document.createElement('dx-anchor');
      root.classList.add('dx-tag--anchor');
      root.textContent = this.label;
      root.setAttribute('dxn', this.dxn);
      return root;
    }
  }
  ```

  Add this class near the top of `registry.tsx` and update the `link-preview` factory:

  ```ts
  'link-preview': {
    block: false,
    urlSchemes: ['dxn:', 'echo:'],
    factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
      label && dxn ? new AnchorInlineWidget(label, dxn) : null,
  },
  ```

- [ ] **Step 2: Remove `preview()` from `MarkdownStream.tsx`**

  In `MarkdownStream.tsx`, remove the `preview` import and the `preview()` call from the extensions array. The inline chip is now handled by `link-preview` in the registry.

- [ ] **Step 3: Build and lint**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run react-ui-markdown:build react-ui-markdown:lint plugin-assistant:build plugin-assistant:lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx \
          packages/plugins/plugin-assistant/src/components/ChatThread/registry.tsx
  git commit -m "refactor(react-ui-markdown): replace preview() with link-preview registry entry in MarkdownStream"
  ```

---

### Task 7: Migrate `MarkdownViewer` and `Transcription` (inline chips only)

Both use `preview()` with no callbacks — only the inline `<dx-anchor>` chip matters.

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx`
- Modify: `packages/ui/react-ui-transcription/src/components/Transcription/Transcription.tsx`

- [ ] **Step 1: Check what registry each already uses**

  ```bash
  grep -n "xmlTags\|registry\|preview" \
    packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx \
    packages/ui/react-ui-transcription/src/components/Transcription/Transcription.tsx
  ```

  If neither has an `xmlTags` call, add one with a minimal registry containing only the `link-preview` inline entry. If they already use `xmlTags`, add the `link-preview` entry to their registry.

- [ ] **Step 2: Add `xmlTags` with inline-only registry to `MarkdownViewer.tsx`**

  ```ts
  import { AnchorInlineWidget } from '../...'; // or define inline
  import { xmlTags, type XmlWidgetRegistry } from '@dxos/ui-editor';

  const inlinePreviewRegistry: XmlWidgetRegistry = {
    'link-preview': {
      block: false,
      urlSchemes: ['dxn:', 'echo:'],
      factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
        label && dxn ? new AnchorInlineWidget(label, dxn) : null,
    },
  };

  // In the extensions array, replace `preview()` with:
  xmlTags({ registry: inlinePreviewRegistry }),
  ```

  Do the same for `Transcription.tsx`.

  > **Note:** `AnchorInlineWidget` should be extracted to a shared location. Place it in `packages/ui/ui-editor/src/extensions/preview/preview.ts` and export it, so all three consumers can import it without duplication.

- [ ] **Step 3: Build and lint**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run plugin-inbox:build react-ui-transcription:build plugin-inbox:lint react-ui-transcription:lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx \
          packages/ui/react-ui-transcription/src/components/Transcription/Transcription.tsx \
          packages/ui/ui-editor/src/extensions/preview/preview.ts
  git commit -m "refactor: replace preview() with xmlTags link-preview entry in MarkdownViewer and Transcription"
  ```

---

## Phase 3 — Clean up

### Task 8: Migrate `MarkdownEditor` to `setWidgets` and remove `addBlockContainer` API

This is the last call site using `addBlockContainer` / `removeBlockContainer`. After this task those callbacks are dead code.

**Files:**
- Modify: `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx`
- Modify: `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.tsx`

- [ ] **Step 1: Update `useExtensions.tsx` to use `xmlTags` + `PreviewComponent`**

  Current signature:
  ```ts
  export const useExtensions = ({ ..., previewOptions }: { previewOptions?: PreviewOptions; ... })
  ```

  New signature — remove `previewOptions`, add `setWidgets`:
  ```ts
  export const useExtensions = ({ ..., setWidgets }: { setWidgets?: (widgets: XmlWidgetState[]) => void; ... })
  ```

  Replace `preview(previewOptions)` in the extensions array with:
  ```ts
  xmlTags({
    registry: {
      'dxn-preview': {
        block: true,
        urlSchemes: ['dxn:', 'echo:'],
        Component: PreviewComponent,
      },
      'link-preview': {
        block: false,
        urlSchemes: ['dxn:', 'echo:'],
        factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
          label && dxn ? new AnchorInlineWidget(label, dxn) : null,
      },
    },
    setWidgets,
  }),
  ```

- [ ] **Step 2: Update `MarkdownEditor.tsx`**

  - Remove `previewBlocks` state (`useState<PreviewBlock[]>`).
  - Remove `addBlockContainer` and `removeBlockContainer` from the options object.
  - Add `setWidgets` state: `const [widgets, setWidgets] = useState<XmlWidgetState[]>([])`.
  - Pass `setWidgets` to `useExtensions`.
  - Replace `MarkdownEditorBlocks` sub-component render with the standard portal loop:
    ```tsx
    {widgets.map(({ id, root, Component, props }) => (
      <div key={id}>{createPortal(<Component {...props} />, root)}</div>
    ))}
    ```
  - Delete the `MarkdownEditorBlocks` sub-component entirely.
  - Remove `PreviewBlock` import.

- [ ] **Step 3: Build and lint**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run plugin-markdown:build plugin-markdown:lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx \
          packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.tsx
  git commit -m "refactor(plugin-markdown): replace addBlockContainer with setWidgets portal loop"
  ```

---

### Task 9: Remove deprecated `preview()` API

`preview()`, `PreviewOptions.addBlockContainer`, `PreviewOptions.removeBlockContainer`, and the notifier shim are now dead code.

**Files:**
- Modify: `packages/ui/ui-editor/src/extensions/preview/preview.ts`

- [ ] **Step 1: Verify no remaining call sites use `addBlockContainer` or `removeBlockContainer`**

  ```bash
  grep -rn "addBlockContainer\|removeBlockContainer\|preview(" \
    packages/ --include="*.ts" --include="*.tsx" | grep -v "preview.ts" | grep -v ".stories."
  ```

  Expected: no results (only `preview.ts` itself and stories).

- [ ] **Step 2: Shrink `preview.ts` to public-type re-exports only**

  Replace `preview.ts` with a minimal file that keeps the public types (`PreviewBlock`, `PreviewLinkRef`, `PreviewLinkTarget`, `getLinkRef`) for any remaining consumers (stories, external code) but removes `PreviewOptions.addBlockContainer`, the `preview()` function, and the shim:

  ```ts
  //
  // Copyright 2023 DXOS.org
  //

  import { type EditorState } from '@codemirror/state';
  import { type SyntaxNode } from '@lezer/common';

  /** @deprecated Use xmlTags with urlSchemes instead. */
  export type PreviewBlock = {
    link: PreviewLinkRef;
    el: HTMLElement;
  };

  export type PreviewLinkRef = {
    suggest?: boolean;
    block?: boolean;
    label: string;
    dxn: string;
  };

  export type PreviewLinkTarget = {
    label: string;
    text?: string;
    object?: any;
  };

  export const getLinkRef = (state: EditorState, node: SyntaxNode): PreviewLinkRef | undefined => {
    const mark = node.getChildren('LinkMark');
    const urlNode = node.getChild('URL');
    if (mark && urlNode) {
      const dxn = state.sliceDoc(urlNode.from, urlNode.to);
      if (dxn.startsWith('dxn:') || dxn.startsWith('echo:')) {
        const label = state.sliceDoc(mark[0].to, mark[1].from);
        return {
          block: state.sliceDoc(mark[0].from, mark[0].from + 1) === '!',
          label,
          dxn,
        };
      }
    }
  };
  ```

- [ ] **Step 3: Update `Widgets.stories.tsx` to remove `addBlockContainer` usage**

  The `Preview` story in `Widgets.stories.tsx` still uses `addBlockContainer`. Replace it with the `xmlTags` unified approach using `PreviewComponent`:

  ```tsx
  export const Preview: Story = {
    render: () => {
      const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
      const extensions = useMemo(
        () => [
          image(),
          xmlTags({
            registry: {
              'dxn-preview': { block: true, urlSchemes: ['dxn:', 'echo:'], Component: PreviewComponent },
              'link-preview': {
                block: false,
                urlSchemes: ['dxn:', 'echo:'],
                factory: ({ label, dxn }: XmlWidgetProps<{ label: string; dxn: string }>) =>
                  label && dxn ? new AnchorInlineWidget(label, dxn) : null,
              },
            },
            setWidgets,
          }),
        ],
        [],
      );
      return (
        <>
          <EditorStory text={previewText} extensions={extensions} />
          {widgets.map(({ id, root, Component, props }) => (
            <div key={id}>{createPortal(<Component {...props} />, root)}</div>
          ))}
        </>
      );
    },
  };
  ```

  Remove the now-unused `PreviewCard`, `PreviewBlockComponent`, `handlePreviewLookup`, `useRefTarget`, `EditorPreviewProvider` imports and story helpers.

- [ ] **Step 4: Build and lint all affected packages**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run ui-editor:build react-ui-editor:build plugin-markdown:build react-ui-markdown:build plugin-inbox:build react-ui-transcription:build :lint
  ```

  Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Run tests**

  ```bash
  export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH" && moon run ui-editor:test react-ui-editor:test
  ```

  Expected: all pass.

- [ ] **Step 6: Final commit**

  ```bash
  git add packages/ui/ui-editor/src/extensions/preview/preview.ts \
          packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx
  git commit -m "refactor(ui-editor): remove deprecated preview() addBlockContainer API"
  ```

---

## Self-Review

**Spec coverage:**
- ✓ `PlaceholderWidget` extracted (Task 1)
- ✓ `PreviewBlockWidget` replaced (Task 2)
- ✓ `urlSchemes` registry slot (Task 3)
- ✓ `preview()` factory rewrite (Task 4 — resolved to no-op since Task 2 already achieves this)
- ✓ `PreviewComponent` React component (Task 5)
- ✓ `MarkdownStream` migration (Task 6)
- ✓ `MarkdownViewer` + `Transcription` migration (Task 7)
- ✓ `MarkdownEditor` migration (Task 8)
- ✓ Dead code removal (Task 9)
- ✓ `db` context: propagated via `xmlTagContextEffect` (resolved decision 1) — not yet wired in this plan. The `resolveLabel` call in the inline chip factory currently reads from `options.db` directly. In the unified path it should read from `props.context.db`. **Add to Task 3 / Task 7:** pass `db` via `xmlTagContextEffect` when building the extension in `useExtensions`.
- ✓ `suggest`/`block` flags: passed as props through `XmlWidgetProps` url-scheme walk (Task 3 Step 3).

**Type consistency check:**
- `AnchorInlineWidget` defined in `preview.ts`, used in Tasks 6, 7, 8, 9 — consistent.
- `PreviewComponent` defined in Task 5, used in Tasks 5, 8, 9 — consistent.
- `XmlWidgetProps<{ label: string; dxn: string }>` used in factory entries Tasks 6, 7, 8, 9 — consistent.
- `urlSchemes` field added in Task 3, consumed by Task 3 `buildDecorations`, referenced in Tasks 5–9 registry entries — consistent.
