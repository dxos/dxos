//
// Copyright 2023 DXOS.org
//

import { defineModule, contributes, Capabilities, Events, definePlugin } from '@dxos/app-framework';
import { translations as boardTranslations } from '@dxos/react-ui-board';

import { meta } from './meta';
import translations from './translations';

export const BoardPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, [...translations, ...boardTranslations]),
    }),
    // defineModule({
    //   id: `${meta.id}/module/metadata`,
    //   activatesOn: Events.SetupMetadata,
    //   activate: () =>
    //     contributes(Capabilities.Metadata, {
    //       id: BoardType.typename,
    //       metadata: {
    //         icon: 'ph--kanban--regular',
    //       },
    //     }),
    // }),
  ]);
