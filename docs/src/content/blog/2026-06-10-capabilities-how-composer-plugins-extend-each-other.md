---
title: 'Capabilities: how Composer plugins extend each other'
slug: capabilities-how-composer-plugins-extend-each-other
date: 2026-06-10
description: A look at the capability mechanism in the DXOS app framework, which lets any plugin define typed extension points that other plugins implement — using comments as a worked example.
author: Rich Burdon
tags: [composer, plugins, architecture]
draft: true
---

Most plugin systems are one-way streets: the host application defines a fixed set of extension points, and plugins fill them in. Composer is built differently. In the DXOS app framework, _every plugin can define extension points_ — and every plugin can implement extension points defined by others. We call these typed contracts **capabilities**, and they are the reason Composer can be assembled from dozens of small plugins that compose without importing each other.

This post walks through the mechanism using a concrete feature — comments — and then surveys other places the same pattern shows up in the [DXOS repo](https://github.com/dxos/dxos).

## The mechanism

A capability is a typed key plus zero or more contributed values. The plugin that owns the contract declares the key:

```ts
// plugin-map/src/types/MapCapabilities.ts
export const MarkerProvider = Capability.make<MarkerProvider>(`${meta.id}.capability.marker-provider`);
```

`Capability.make<T>()` produces an identifier bound to the TypeScript type `T` — the value's shape is checked at the point of contribution and known at the point of consumption. Any plugin can then contribute an implementation from one of its modules:

```ts
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(MapCapabilities.MarkerProvider, myProvider);
  }),
);
```

Three properties make this more than a glorified service locator:

- **Many-to-many.** A capability can have any number of contributors, and consumers ask for one (`Capability.get`) or all of them (`Capability.getAll`, or the `useCapabilities` hook in React). Aggregation is the default, so "every plugin that can plot markers on a map" is a single call.
- **Lazy.** Contributions are wrapped in `Capability.lazy()` modules that load on activation events (`SetupSchema`, `SetupReactSurface`, `Startup`, …). A plugin's comment integration costs nothing until comments are actually used — the module boundary doubles as a code-splitting boundary.
- **Decoupled.** The contract lives in a small `types` entrypoint (or in the shared app toolkit). Contributors import the key, never the host plugin's implementation. The host resolves contributions at runtime without knowing who provided them.

## Worked example: comments

The comments plugin (`plugin-comments`) owns everything generic about commenting: the `Thread`/`AnchoredTo` data model, the comments companion panel that opens next to the active document, toolbar actions, undo, and an optional AI agent that can reply in a thread. What it deliberately does _not_ know is which object types are commentable, or what a comment anchor means inside any given document.

That knowledge is delegated to a capability — a small declarative config, keyed by typename:

```ts
export type CommentConfig = Readonly<{
  id: string; // The typename this config applies to.
  comments: 'anchored' | 'unanchored';
  selectionMode?: string;
  getAnchorLabel?: (obj: any, anchor: string) => string | undefined;
  scrollToAnchor?: Operation.Definition.Any;
}>;
```

The markdown plugin opts its `Document` type in with an _anchored_ config — comments attach to text ranges, and the config teaches the comments plugin how to label an anchor and how to scroll to it:

```ts
// plugin-markdown/src/capabilities/comment-config.ts
const config: AppCapabilities.CommentConfig = {
  id: Type.getTypename(Markdown.Document),
  comments: 'anchored',
  selectionMode: 'multi-range',
  getAnchorLabel: (doc, anchor) => {
    const [start, end] = anchor.split(':');
    return getTextInRange(createDocAccessor(doc.content.target!, ['content']), start, end);
  },
  scrollToAnchor: MarkdownOperation.ScrollToAnchor,
};
return Capability.contributes(AppCapabilities.CommentConfig, config);
```

On the other side, the comments plugin resolves configs by typename when it builds the app graph:

```ts
const getCommentConfig = (typename: string) =>
  capabilities.getAll(AppCapabilities.CommentConfig).find(({ id }) => id === typename);
```

If a config exists for the active object's type, the comments companion is offered next to the article and an "Add comment" toolbar action appears — wired to the selection for anchored types, or to the object as a whole for unanchored ones. Sketches and tables contribute one-line `unanchored` configs; spreadsheets contribute an `anchored` config with cell-range anchors; bookmarks and videos opt in so you can discuss a saved page or a generated transcript.

The best part is that the extension runs in both directions. The comments plugin is itself a contributor: it injects the comment-highlighting CodeMirror extension into the markdown editor via `MarkdownCapabilities.ExtensionProvider` — the markdown plugin's own extension point. Markdown extends comments (with a config); comments extends markdown (with an editor extension). Neither imports the other's internals, and either feature can be removed from the app without breaking the other.

## The same pattern, everywhere

Once you start looking, capabilities are how most cross-cutting features in Composer are assembled:

| Capability                               | Defined by      | Contributed by                                   | What it extends                                  |
| ---------------------------------------- | --------------- | ------------------------------------------------ | ------------------------------------------------ |
| `AppCapabilities.CommentConfig`          | app toolkit     | markdown, sheet, table, sketch, bookmarks, video | Which types are commentable, and how             |
| `MarkdownCapabilities.ExtensionProvider` | plugin-markdown | comments, and any plugin with editor smarts      | CodeMirror extensions in the markdown editor     |
| `MapCapabilities.MarkerProvider`         | plugin-map      | plugins whose objects have locations             | Plotting other plugins' objects on a map         |
| `GameCapabilities.VariantProvider`       | plugin-game     | plugin-chess, …                                  | Pluggable game variants                          |
| `TripCapabilities.RoutingService`        | plugin-trip     | plugin-osrm                                      | Driving-route computation for trip planning      |
| `TripCapabilities.BookingService`        | plugin-trip     | plugin-duffel                                    | Flight search behind a provider-neutral contract |
| `CallsCapabilities.EventHandler`         | plugin-calls    | plugin-meeting                                   | Call lifecycle hooks (e.g. transcription)        |
| `ThreadCapabilities.ChannelBackend`      | plugin-thread   | plugin-bluesky                                   | Alternate message backends for channels          |
| `CrxCapabilities.PageAction`             | plugin-crx      | plugin-bookmarks, …                              | Actions in the browser-extension popup           |

The naming gives away the role: `Provider` for data and factories, `Service` for active work like routing or search, `EventHandler` for lifecycle callbacks, `Config` for declarative opt-ins like comments.

## Why it matters

Capabilities are what let Composer behave like an operating system for collaborative software rather than a monolith. Features meet at typed seams instead of import statements, so a plugin written by a third party can light up map markers, comment support, or an AI tool without anyone touching the host plugin. And because contributions are lazy, the cost of all this composability is paid only when a feature is actually exercised.

If you want to go deeper, the framework primitives live in [`@dxos/app-framework`](https://github.com/dxos/dxos/tree/main/packages/sdk/app-framework), and `plugin-chess` is the canonical, minimal example of a plugin that both consumes and defines capabilities.
