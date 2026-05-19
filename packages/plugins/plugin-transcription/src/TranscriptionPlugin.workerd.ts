//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Transcript } from '@dxos/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Transcript.Transcript] }),
  Plugin.make,
);

export default TranscriptionPlugin;
