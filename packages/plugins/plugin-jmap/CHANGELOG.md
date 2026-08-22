# @dxos/plugin-jmap

## 0.12.0

### Patch Changes

- 08c82f9: `projects.create` projects as the `projectCreate` MCP tool, so the last curated project verb in edge's MCP server can retire — the operation already serialized into the registry and only lacked the annotation.

  The entries a headless host imports directly (`./operations`, and plugin-projects' `./skills`) are now guarded against React reaching them, closing the gap that made those imports a silent liability.

  `dx-trace-imports` accepts repeated `--export` and `--to`, so one guard covers every entry a headless host imports. Repeating either flag previously stringified the array into a value matching nothing; `--to` failed silently, which is how plugin-jmap's and plugin-google's headless constraints went unenforced.

- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- Updated dependencies [0280a6a]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [e2eecf2]
- Updated dependencies [592b00e]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [2d4107f]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [ea11703]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [9c86066]
- Updated dependencies [a3d45c4]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [dbff1e4]
- Updated dependencies [5fcd238]
- Updated dependencies [e094f74]
- Updated dependencies [261c821]
- Updated dependencies [a3b6ef0]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [d62a947]
- Updated dependencies [cafa240]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [098a0bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ca2ac7]
- Updated dependencies [098a0bb]
- Updated dependencies [9c86066]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [fa36e26]
- Updated dependencies [098a0bb]
- Updated dependencies [ab79741]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [678ba58]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [cc11297]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/plugin-inbox@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/link@0.12.0
  - @dxos/pipeline-email@0.12.0
  - @dxos/plugin-connector@0.12.0
  - @dxos/extractor-lib@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/types@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/extractor@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/log@0.12.0
  - @dxos/util@0.12.0
  - @dxos/pipeline@0.12.0
