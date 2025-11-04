//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DataType } from '@dxos/schema';

import { PreviewPopover, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const PreviewPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => [contributes(ClientCapabilities.Schema, [DataType.Person.Person, DataType.Organization.Organization])],
  }),
  defineModule({
    id: `${meta.id}/module/preview-popover`,
    activatesOn: Events.Startup,
    activate: PreviewPopover,
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
]);
