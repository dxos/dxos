//
// Copyright 2023 DXOS.org
//

export * from './parser';

// NOTE: `./sandbox` (QuerySandbox) is intentionally NOT re-exported here. It runtime-imports the
// vendored QuickJS wasm runtime (`@dxos/vendor-quickjs`), which every barrel consumer would then
// pull into its bundle even though only sandbox users need it. Import it from `@dxos/echo-query/sandbox`.
