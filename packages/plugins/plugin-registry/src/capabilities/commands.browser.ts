//
// Copyright 2026 DXOS.org
//

// Empty outside node: the registry commands reach the vite plugin's Node-only build tooling, so a browser host
// (the devtools terminal) contributes no commands rather than a broken graph. `#commands`
// resolves this in place of `./commands` under the default condition.
const commands: [] = [];

export default commands;
