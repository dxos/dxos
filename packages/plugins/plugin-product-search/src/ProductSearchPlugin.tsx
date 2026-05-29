//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { BlueprintDefinition, OperationHandler, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Provider, Result, Search } from './types';

export const ProductSearchPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Provider.Provider, Search.Search, Result.Result] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProductSearchPlugin;
