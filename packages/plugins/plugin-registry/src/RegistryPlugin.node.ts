//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from '#meta';

// Imported from the node barrel directly rather than through `#capabilities`: the `registry
// publish` command reaches `@dxos/app-framework/vite-plugin`, and `#capabilities` resolves its
// types through the browser barrel, which would put that node-only graph in the app bundle.
import { Commands } from './capabilities/node';

export const RegistryPlugin = Plugin.define(meta).pipe(Plugin.addModule(Commands), Plugin.make);

export default RegistryPlugin;
