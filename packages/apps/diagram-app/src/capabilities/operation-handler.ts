//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

/**
 * The layout operations other plugins call: the dialog, popover and toasts, the members panel, and opening a space or
 * diagram.
 */
const handlers = OperationHandlerSet.lazy([
  LayoutOperation.AddToast.pipe(Operation.lazyHandler(() => import('../operations/add-toast.ts'))),
  LayoutOperation.Open.pipe(Operation.lazyHandler(() => import('../operations/open.ts'))),
  LayoutOperation.SwitchWorkspace.pipe(Operation.lazyHandler(() => import('../operations/switch-workspace.ts'))),
  LayoutOperation.UpdateComplementary.pipe(
    Operation.lazyHandler(() => import('../operations/update-complementary.ts')),
  ),
  LayoutOperation.UpdateDialog.pipe(Operation.lazyHandler(() => import('../operations/update-dialog.ts'))),
  LayoutOperation.UpdatePopover.pipe(Operation.lazyHandler(() => import('../operations/update-popover.ts'))),
]);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.OperationHandler, handlers)),
);
