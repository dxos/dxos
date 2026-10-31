# @dxos/plugin-theme

## 0.17.0

### Patch Changes

- 0590c11: New Demo space template: sixteen chess games at every stage, a world map of every Cloudflare data centre with a globe tour from Los Angeles to Sydney, a voxel creeper, a voxel town, and a spacetime scene of three race cars and a fire truck. `@dxos/plugin-spacetime` is now public, with a `SpacetimePresets` entry that builds a preset model (fire truck, race car, taxi) as a stored mesh. A game now has an optional `description`, which chess keeps set to the current FEN so tables and cards show each position; chess cards draw their board full width again, and the move list drops its focus ring. A map's `coordinates` are its globe tour route; the globe gets a light street-map palette, small dark-blue markers, a red tour route and a margin at rest, and flat-map pins shrink to 60%. The DXOS Architecture template's metrics sheet gains a pie of the busiest plugins' PR share. Refs to the same object from different clients in one page no longer share a cached atom, so each client resolves a ref through its own database (previously every client's editor bound to whichever client loaded the object first). Replicated comments now show up on every peer: the editor retries an anchor whose cursor cites edits not yet received, and comment sync re-reads anchors when a thread arrives after its anchor. Many clients editing one document replicate much faster: sync no longer rebuilds Automerge changes on every message to check a peer's initial heads (patched `@automerge/automerge-repo`), and a query from objects to typed relations on them (`select(...).targetOf(Type)`, as comment threads use) re-runs only when those objects, relations of that type, or the relations' endpoints change, rather than on every write in the space. A masonry grid now has the same gap on all four sides: inside a padded `Masonry.Content` it adds the gap above and below as well as at the sides, and a non-scrolling grid (`scroll={false}`) adds none, leaving the perimeter to its host. Padding of `p-3` is now the equivalent `p-trim-md` token. A toolbar now insets both ends by the same gap, whether the edge item is a labelled control or an icon-only button, plugin-theme registers the menu translations so the overflow button reads "More", and a project's pipeline toggle reads "Hide pipeline" while the chart is shown.
- 80c25fe: The transcription microphone shows in every chat prompt again, just before Send: the Space Home prompt, the assistant companion before its first message, an agent's chat, and stored chats. Each prompt reads the buttons other plugins add to it from a hidden prompt node under the node that hosts it, which `AppNode.makePrompt`, `AppNode.getPromptId` and `AppNode.PROMPT_TYPE` describe; contributors file app-graph actions on it with the `prompt` disposition. Every surface that hosts a chat article now passes its graph node as `nodeId`, which is where the prompt finds its host. `ObjectAction` is deprecated in favour of app-graph actions on the subject's node.
- Updated dependencies [9cb96c7]
- Updated dependencies [710da43]
- Updated dependencies [df16fba]
- Updated dependencies [e8029c3]
- Updated dependencies [f142d06]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9d66bcd]
- Updated dependencies [49df146]
- Updated dependencies [17a9e75]
- Updated dependencies [45e1c93]
- Updated dependencies [03ee407]
- Updated dependencies [6fd1079]
- Updated dependencies [2d585c2]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [80c25fe]
- Updated dependencies [5970ed3]
- Updated dependencies [4fe25ee]
- Updated dependencies [f175a2d]
- Updated dependencies [7da5d17]
- Updated dependencies [ca2a4a8]
- Updated dependencies [02254b0]
- Updated dependencies [3b37cd1]
- Updated dependencies [d00cc85]
- Updated dependencies [0a14251]
- Updated dependencies [e7ca5d7]
- Updated dependencies [e1d537b]
- Updated dependencies [1a0fff1]
- Updated dependencies [e67aa80]
  - @dxos/app-toolkit@0.17.0
  - @dxos/app-framework@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/react-ui-menu@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/react-ui-mosaic@0.17.0
  - @dxos/react-ui-calendar@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/util@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/i18n@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/app-framework@0.16.0
  - @dxos/app-toolkit@0.16.0
  - @dxos/react-ui-calendar@0.16.0
  - @dxos/react-ui-mosaic@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/i18n@0.16.0
  - @dxos/util@0.16.0
  - @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [b82150a]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [d250ed2]
- Updated dependencies [55bdf55]
- Updated dependencies [098a536]
- Updated dependencies [25af912]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
  - @dxos/react-ui@0.15.0
  - @dxos/app-framework@0.15.0
  - @dxos/app-toolkit@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/util@0.15.0
  - @dxos/i18n@0.15.0
  - @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [0715304]
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [1819960]
- Updated dependencies [b07f49f]
  - @dxos/app-framework@0.14.0
  - @dxos/react-ui@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/app-toolkit@0.14.0
  - @dxos/i18n@0.14.0
  - @dxos/util@0.14.0
  - @dxos/ui-types@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [d2a6aad]
- Updated dependencies [cb1e218]
- Updated dependencies [69a4a85]
- Updated dependencies [7d222fc]
- Updated dependencies [e99ee70]
- Updated dependencies [ff92c50]
- Updated dependencies [3e73e53]
- Updated dependencies [9ab98cd]
- Updated dependencies [8fc641a]
- Updated dependencies [38e2ddb]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
- Updated dependencies [1b37aa8]
- Updated dependencies [321c99f]
- Updated dependencies [6ea9d4d]
- Updated dependencies [49731e1]
  - @dxos/react-ui@0.13.0
  - @dxos/util@0.13.0
  - @dxos/app-toolkit@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/i18n@0.13.0
  - @dxos/ui-theme@0.13.0
  - @dxos/ui-types@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [6a457ac]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [c020513]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [4a0b78b]
- Updated dependencies [2d58ea5]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [2d4107f]
- Updated dependencies [fd23a8b]
- Updated dependencies [5262408]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [5305365]
- Updated dependencies [9a36b1e]
- Updated dependencies [b63506b]
- Updated dependencies [dd17e57]
- Updated dependencies [6d28380]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [318d610]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2643a00]
- Updated dependencies [362fd0f]
- Updated dependencies [dbff1e4]
- Updated dependencies [497caab]
- Updated dependencies [2e4c299]
- Updated dependencies [b02fe16]
- Updated dependencies [f0d3620]
- Updated dependencies [472ca95]
- Updated dependencies [548e82c]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [967b130]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [882ac2a]
- Updated dependencies [3ea0b0f]
- Updated dependencies [4e4c25d]
- Updated dependencies [9c86066]
- Updated dependencies [3294b3d]
- Updated dependencies [cc45381]
- Updated dependencies [818a096]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [8efc4f1]
- Updated dependencies [a04ab6e]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [b72c1a2]
- Updated dependencies [b1bb838]
- Updated dependencies [d308bf8]
- Updated dependencies [07514c2]
- Updated dependencies [1ab4bb8]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [d005fd9]
- Updated dependencies [0e44f24]
- Updated dependencies [cef0a3b]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [dea5df9]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [7263241]
- Updated dependencies [6fed038]
- Updated dependencies [0a27bde]
- Updated dependencies [886453b]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [63629c5]
- Updated dependencies [6a1ec57]
- Updated dependencies [82a9c4e]
- Updated dependencies [e3d7a8c]
- Updated dependencies [5dedae9]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [d205e96]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [a1d42c4]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [11de244]
- Updated dependencies [6dadb41]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/util@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/i18n@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/i18n@0.11.1
- @dxos/keys@0.11.1
- @dxos/operation@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 3400dc1: Add an appearance setting (Light / Dark / System, default System) that overrides the OS colour-scheme preference. Persisted per-device and applied live across all tabs in the same browser.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [f10b1ce]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/operation@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/i18n@0.11.0
