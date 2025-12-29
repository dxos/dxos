//
// Copyright 2024 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

// import { IntentResolver } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const TransformerPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSchemaModule({ schema: [], id: 'schema' }),
  // Plugin.addModule({
  //   id: 'intent-resolver',
  //   activatesOn: Events.SetupIntentResolver,
  //   activate: IntentResolver,
  // }),
  Plugin.make,
);
