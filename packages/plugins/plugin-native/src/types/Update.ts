//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

// The update surface is shared with the web (`plugin-pwa` contributes the same capability), so the
// shape lives in app-toolkit and this module only re-exports it. Kept as a module rather than deleted
// so `#types`' `Update` namespace and the existing imports keep resolving.
export type { Manager, Progress, Status } from '@dxos/app-toolkit/AppUpdate';
