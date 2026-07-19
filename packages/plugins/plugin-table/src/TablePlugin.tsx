//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as tableTranslations } from '@dxos/react-ui-table/translations';
import { Table } from '@dxos/react-ui-table/types';

import {
  CommentConfig,
  CreateObject,
  OnTypeAdded,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TablePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(CommentConfig),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Table.Table])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations([...translations, ...formTranslations, ...tableTranslations])),
  Plugin.addLazyModule(OnTypeAdded),
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

export default TablePlugin;
