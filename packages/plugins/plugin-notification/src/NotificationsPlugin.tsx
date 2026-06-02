//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { NotificationRule } from '@dxos/types';

import { NotificationsLifecycle, NotificationsSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const NotificationsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [NotificationRule.NotificationRule] }),
  AppPlugin.addSettingsModule({ activate: NotificationsSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'notifications-lifecycle',
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: NotificationsLifecycle,
  }),
  Plugin.make,
);

export default NotificationsPlugin;
