//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CrxCapabilities from '@dxos/plugin-crx/CrxCapabilities';
import * as CrxEvents from '@dxos/plugin-crx/CrxEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { BookmarksEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: BookmarksEvents.Start,
});

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});

export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction], activatesOn: CrxEvents.Start },
  () => import('./page-action'),
);

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const Translations = AppCapability.translations(translations);
