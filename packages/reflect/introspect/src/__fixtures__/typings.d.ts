//
// Copyright 2026 DXOS.org
//

// Ambient module declarations for the fixture monorepo.

// The fixtures aren't real workspace packages (excluded from pnpm-workspace.yaml),
// so cross-package imports like `@fixture/pkg-a` don't resolve through node_modules.
// These declarations let the IDE and the fixture-build test see correct types
// without making the fixtures real workspaces.

declare module '@fixture/pkg-a' {
  export * as Task from './packages/pkg-a/src/Task';
}
