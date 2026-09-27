//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';

import * as SandboxCapabilities from '../types/SandboxCapabilities.ts';

/**
 * Runs local sandboxes for the desktop webview, which cannot spawn processes itself. Resolved only
 * under the `tauri` condition, so web, Node and workerd builds never carry the shell plugin; the
 * helper spawns on first use, so activating with the app costs nothing.
 */
export const LocalLauncher: Capability.Module | undefined = Capability.lazyModule(
  'LocalLauncher',
  { provides: [SandboxCapabilities.LocalLauncher], activatesOn: ActivationEvents.Startup },
  () => import('./local-launcher.ts'),
);
