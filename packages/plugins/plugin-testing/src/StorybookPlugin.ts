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
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactContext),
  Plugin.addModule(State),
  Plugin.make,
);

export default StorybookPlugin;
