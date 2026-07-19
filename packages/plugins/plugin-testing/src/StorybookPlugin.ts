//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { OperationHandler, ReactContext, State } from '#capabilities';
import { meta } from '#meta';
import { StorybookCapabilities } from '#types';

export type StorybookPluginOptions = {
  initialState?: Partial<StorybookCapabilities.LayoutStateProps>;
};

export const StorybookPlugin = Plugin.define<StorybookPluginOptions>(meta).pipe(
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactContext),
  Plugin.addLazyModule(State),
  Plugin.make,
);

export default StorybookPlugin;
