//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { translations as boardTranslations } from '@dxos/react-ui-board/translations';

import { CreateObject, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Board } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BoardPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(AppCapability.schema([Board.Board])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations([...translations, ...boardTranslations])),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default BoardPlugin;
