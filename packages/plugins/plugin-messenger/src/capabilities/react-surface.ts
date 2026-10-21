//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { MessengerCompanion, MessengerSettings } from '#containers';
import { MESSENGER_COMPANION, meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'notificationsPanel',
        filter: Surface.makeFilter(AppSurface.deckCompanion(MESSENGER_COMPANION)),
        component: MessengerCompanion,
        props: ({ data }) => ({ attendableId: data.id }),
      }),
      Surface.create({
        id: 'settings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: MessengerSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
