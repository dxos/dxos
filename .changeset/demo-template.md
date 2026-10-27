---
'@dxos/plugin-debug': patch
'@dxos/plugin-chess': patch
'@dxos/plugin-game': patch
'@dxos/plugin-map': patch
'@dxos/react-ui-geo': patch
'@dxos/plugin-canvas': patch
'@dxos/plugin-spacetime': patch
'@dxos/echo': patch
'@dxos/ui-editor': patch
'@dxos/plugin-review': patch
'@dxos/echo-host': patch
'@dxos/react-ui-masonry': patch
'@dxos/react-ui': patch
'@dxos/plugin-theme': patch
'@dxos/plugin-projects': patch
---

New Demo space template: sixteen chess games at every stage, a world map of every Cloudflare data centre with a globe tour from Los Angeles to Sydney, a voxel creeper, a voxel town, and a spacetime scene of three race cars and a fire truck. `@dxos/plugin-spacetime` is now public, with a `SpacetimePresets` entry that builds a preset model (fire truck, race car, taxi) as a stored mesh. A game now has an optional `description`, which chess keeps set to the current FEN so tables and cards show each position; chess cards draw their board full width again, and the move list drops its focus ring. A map's `coordinates` are its globe tour route; the globe gets a light street-map palette, small dark-blue markers, a red tour route and a margin at rest, and flat-map pins shrink to 60%. The DXOS Architecture template's metrics sheet gains a pie of the busiest plugins' PR share. Refs to the same object from different clients in one page no longer share a cached atom, so each client resolves a ref through its own database (previously every client's editor bound to whichever client loaded the object first). Replicated comments now show up on every peer: the editor retries an anchor whose cursor cites edits not yet received, and comment sync re-reads anchors when a thread arrives after its anchor. Many clients editing one document replicate much faster: sync no longer rebuilds Automerge changes on every message to check a peer's initial heads (patched `@automerge/automerge-repo`), and a query from objects to typed relations on them (`select(...).targetOf(Type)`, as comment threads use) re-runs only when those objects, relations of that type, or the relations' endpoints change, rather than on every write in the space. A masonry grid now has the same gap on all four sides: inside a padded `Masonry.Content` it adds the gap above and below as well as at the sides, and a non-scrolling grid (`scroll={false}`) adds none, leaving the perimeter to its host. Padding of `p-3` is now the equivalent `p-trim-md` token. A toolbar now insets both ends by the same gap, whether the edge item is a labelled control or an icon-only button, plugin-theme registers the menu translations so the overflow button reads "More", and a project's pipeline toggle reads "Hide pipeline" while the chart is shown.
