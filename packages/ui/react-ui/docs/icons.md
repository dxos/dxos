# Icons

## How an Icon Name Becomes a Glyph

Icons are referenced by name — `ph--plus--regular`, i.e. `{set}--{name}--{weight}` — never by file path.
Two mechanisms turn a name into a rendered glyph, and every icon takes one of them:

1. **The build-time sprite.** `@dxos/vite-plugin-icons` scans the host's sources for icon names, pulls the
   matching SVGs out of the icon-set catalog, and writes them into a single sprite at `/icons.svg`.
2. **Runtime resolution.** Names the scanner never saw are fetched individually from the host's icon-set
   route (e.g. `/phosphor/regular/plus.svg`) the first time something renders them.

The second mechanism exists because the first cannot see everything. The scanner walks source globs at
build time, so it has no way to know about a plugin installed from the external registry at runtime — that
plugin's code did not exist when the app was built. Before runtime resolution, such icons silently rendered
blank.

## The Registry

`IconRegistry` (`src/primitives/ThemeProvider/IconRegistry.tsx`) owns both paths. `ThemeProvider` mounts it,
and it is a **refcounted document-level singleton**: a document typically mounts many `ThemeProvider`s (the
shell, dialogs, each editor tooltip root), and all of them share one registry. A registry per mount would
re-fetch the sprite and duplicate every symbol id in the DOM.

On creation the registry fetches `/icons.svg` once and copies its `<symbol>` elements into a hidden `<svg>`
appended to `document.body`. Icons therefore reference symbols **in the same document**:

```html
<svg class="dx-icon"><use href="#ph--plus--regular" /></svg>
```

Not `href="/icons.svg#ph--plus--regular"`. The same-document form is what makes runtime injection work: a
symbol added to the in-page container is immediately referenceable, whereas a cross-document sprite URL is
fixed at whatever the server returned.

### Lookup

`useIconHref(icon)` subscribes to the registry via `useSyncExternalStore`:

- **Symbol present** → returns `#${icon}`; the glyph renders immediately.
- **Symbol absent** → returns `undefined` (the `<use>` is omitted, so nothing renders) and calls
  `requestIcon(icon)`. When resolution completes, the registry notifies subscribers, the component
  re-renders, and the glyph appears.

Returning `undefined` rather than a speculative `#name` is deliberate: it avoids leaving a dangling
reference in the DOM and distinguishes "no icon requested" from "icon requested, not yet loaded".

### Resolution

`requestIcon` parses the name into set/name/weight and looks for a matching `IconSource`:

```ts
export type IconSource = {
  iconSet: string; // e.g. 'ph'
  url: (name: string, variant: string) => string;
};
```

`phosphorIconSource(route = '/phosphor')` is the default, encoding Phosphor's published layout
(`{variant}/{name}[-{variant}].svg`, regular unsuffixed). Pass `sources` to `IconRegistryProvider` to
resolve other sets. With a source, the SVG is fetched, wrapped in a `<symbol fill="currentColor">`, and
appended to the in-page container.

Three cases are cached so a repeated render cannot produce repeated traffic:

| Outcome                                    | Behavior                                      |
| ------------------------------------------ | --------------------------------------------- |
| In flight                                  | Deduped — N components, one fetch             |
| Permanent miss (no source, 404, malformed) | Remembered; never re-fetched                  |
| Network error                              | **Not** cached — transient, so retry is valid |

## Host Requirements

Runtime resolution only works if the host actually serves the catalog, which is opt-in via the `assets`
option of `@dxos/vite-plugin-icons`:

```ts
IconsPlugin({
  // ...sprite options
  assets: [{ route: '/phosphor', dir: phosphorIconsCore }],
});
```

That serves the catalog from `node_modules` in dev and copies it into the build output for production. A
host that omits it is sprite-only: unscanned names stay blank. This is a legitimate choice —
`composer-crx` omits it because copying a full catalog would bloat the packaged extension.

Because the catalog is large (~9,000 files for Phosphor), it must **not** go into a service-worker
precache — that would add one install-time request per file. `composer-app` instead excludes
`**/phosphor/**` from the precache manifest and serves the route cache-first at runtime (workbox
`CacheFirst` + `ExpirationPlugin` in `src/sw.ts`), so any icon the app has actually rendered stays
available offline.

## Non-React Consumers

`@dxos/lit-ui`'s `<dx-icon>` cannot import from `@dxos/react-ui` (wrong direction, and Lit is excluded
from the source-resolution path). The registry therefore publishes itself as `globalThis.__dxIconRegistry`,
and `getIconRegistry()` reads it back. `<dx-icon>` follows the same contract as `useIconHref` — omit the
`<use>` while unresolved, subscribe, re-render when the symbol lands, unsubscribe on disconnect.

## Gotchas

- **A missing icon is not necessarily a bug in the name.** Check, in order: is the set configured as an
  `IconSource`? Does the host serve that route? Does the file exist in the catalog under the expected
  weight-suffixed filename?
- **`dx--*` brand glyphs are sprite-only.** They have no weight variants and no runtime source, so they
  must be reachable by the build-time scanner.
- **Icons render one frame late on first resolution.** Anything asserting on icon presence immediately
  after mount (tests, screenshots) must wait for the fetch.
- **SSR is unsupported.** The in-page container is built from `document`; `useIconHref` returns
  `undefined` on the server.
