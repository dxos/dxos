# @dxos/react-ui-masonry

## 0.17.0

### Patch Changes

- 0590c11: New Demo space template: sixteen chess games at every stage, a world map of every Cloudflare data centre with a globe tour from Los Angeles to Sydney, a voxel creeper, a voxel town, and a spacetime scene of three race cars and a fire truck. `@dxos/plugin-spacetime` is now public, with a `SpacetimePresets` entry that builds a preset model (fire truck, race car, taxi) as a stored mesh. A game now has an optional `description`, which chess keeps set to the current FEN so tables and cards show each position; chess cards draw their board full width again, and the move list drops its focus ring. A map's `coordinates` are its globe tour route; the globe gets a light street-map palette, small dark-blue markers, a red tour route and a margin at rest, and flat-map pins shrink to 60%. The DXOS Architecture template's metrics sheet gains a pie of the busiest plugins' PR share. Refs to the same object from different clients in one page no longer share a cached atom, so each client resolves a ref through its own database (previously every client's editor bound to whichever client loaded the object first). Replicated comments now show up on every peer: the editor retries an anchor whose cursor cites edits not yet received, and comment sync re-reads anchors when a thread arrives after its anchor. Many clients editing one document replicate much faster: sync no longer rebuilds Automerge changes on every message to check a peer's initial heads (patched `@automerge/automerge-repo`), and a query from objects to typed relations on them (`select(...).targetOf(Type)`, as comment threads use) re-runs only when those objects, relations of that type, or the relations' endpoints change, rather than on every write in the space. A masonry grid now has the same gap on all four sides: inside a padded `Masonry.Content` it adds the gap above and below as well as at the sides, and a non-scrolling grid (`scroll={false}`) adds none, leaving the perimeter to its host. Padding of `p-3` is now the equivalent `p-trim-md` token. A toolbar now insets both ends by the same gap, whether the edge item is a labelled control or an icon-only button, plugin-theme registers the menu translations so the overflow button reads "More", and a project's pipeline toggle reads "Hide pipeline" while the chart is shown.
- Updated dependencies [df16fba]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9d66bcd]
- Updated dependencies [17a9e75]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [4fe25ee]
- Updated dependencies [7da5d17]
- Updated dependencies [ca2a4a8]
- Updated dependencies [d00cc85]
- Updated dependencies [e67aa80]
  - @dxos/react-ui@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/react-hooks@0.17.0
  - @dxos/react-focus@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/react-focus@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui-theme@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [55bdf55]
- Updated dependencies [25af912]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
  - @dxos/react-ui@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/react-focus@0.15.0
  - @dxos/ui-theme@0.15.0

## 0.14.0

### Patch Changes

- 385f3ce: The space Home page no longer holds its sections back or shifts while documents load: Recent reserves placeholder tiles sized from an index-only count, Activity waits for its stats instead of showing zeros, starter prompts show from the cache at once and skip the recent-objects query within the refresh interval, the assistant prompt renders before its chat model opens, and the recent-objects filter no longer repeats types. `Masonry` now lays out at its measured size in its first painted frame instead of starting at zero height, and reveals at once when an earlier mount cached every tile's height.
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [b07f49f]
  - @dxos/react-ui@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/react-focus@0.14.0
  - @dxos/react-hooks@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [d2a6aad]
- Updated dependencies [7d222fc]
- Updated dependencies [1b37aa8]
- Updated dependencies [321c99f]
- Updated dependencies [49731e1]
  - @dxos/react-ui@0.13.0
  - @dxos/react-focus@0.13.0
  - @dxos/react-hooks@0.13.0
  - @dxos/ui-theme@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [b63506b]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [098a0bb]
- Updated dependencies [818a096]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [07531e0]
- Updated dependencies [a04ab6e]
- Updated dependencies [d4b4919]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [928e0b2]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [77d0026]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/react-hooks@0.12.0

## 0.11.1

### Patch Changes

- @dxos/echo-react@0.11.1
- @dxos/react-hooks@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-types@0.11.1

## 0.11.0

### Minor Changes

- 9ded6b9: Masonry no longer flashes a bunched, overlapping stack on the initial render of a large set: unmeasured tiles now use an estimated height so the first layout is already spaced into columns, and the grid stays hidden until the layout settles before fading in (respecting `prefers-reduced-motion`). Reflow animation is limited to small add/remove edits — the initial render, bulk data swaps, and resizes snap instead of animating — and a new `animate` prop on `Masonry.Root` disables animation entirely.

### Patch Changes

- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
  - @dxos/react-ui@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/random@0.11.0
