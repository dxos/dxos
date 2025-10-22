//
// Copyright 2023 DXOS.org
//

import { Events, defineModule, definePlugin, oneOf } from '@dxos/app-framework';

import { IntentResolver, type MobileLayoutState, ReactRoot, State } from './capabilities';
import { meta } from './meta';

export type MobileLayoutPluginOptions = {
  initialState?: Partial<MobileLayoutState>;
};

export const MobileLayoutPlugin = definePlugin<MobileLayoutPluginOptions>(meta, ({ initialState }) => [
  defineModule({
    id: `${meta.id}/module/state`,
    activatesOn: oneOf(Events.SetupSettings, Events.SetupAppGraph),
    activatesAfter: [Events.LayoutReady],
    activate: () => State({ initialState }),
  }),
  defineModule({
    id: `${meta.id}/module/react-root`,
    activatesOn: Events.Startup,
    activate: ReactRoot,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
]);
