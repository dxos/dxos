//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { MailboxAction, MailboxProcessor, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const LabelerPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(MailboxAction),
  Plugin.addModule(MailboxProcessor),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

export { LabelerOperationHandlerSet } from '#operations';

export default LabelerPlugin;
