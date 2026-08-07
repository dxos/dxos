//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as boardTranslations } from '@dxos/react-ui-board/translations';

import { CreateObject, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import * as Board from './types/Board';

export const BoardPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(AppCapability.schema([Board.Board])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations([...translations, ...boardTranslations])),
  Plugin.addModule(
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
