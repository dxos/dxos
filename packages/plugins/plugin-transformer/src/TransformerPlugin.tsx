//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

// import { IntentResolver } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const TransformerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [], id: 'schema' }),
  AppPlugin.addTranslationsModule({ translations }),
  // Plugin.addModule({
  //   id: 'intent-resolver',
  //   activatesOn: Events.SetupIntentResolver,
  //   activate: IntentResolver,
  // }),
  Plugin.make,
);
