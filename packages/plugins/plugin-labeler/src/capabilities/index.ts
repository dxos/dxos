//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

export const MailboxAction = Capability.lazyModule(
  'MailboxAction',
  // Rides the inbox feature it contributes to: the button is unreachable until a mailbox renders.
  { provides: [InboxCapabilities.MailboxAction], activatesOn: InboxEvents.Start },
  () => import('./mailbox-action.ts'),
);

export const MailboxProcessor = Capability.lazyModule(
  'MailboxProcessor',
  { provides: [InboxCapabilities.MailboxProcessor], activatesOn: InboxEvents.Start },
  () => import('./mailbox-processor.ts'),
);

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
