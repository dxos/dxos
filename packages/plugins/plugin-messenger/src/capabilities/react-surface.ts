//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { MessengerCompanion } from '#containers';
import { MESSENGER_COMPANION } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'notificationsPanel',
        filter: Surface.makeFilter(AppSurface.deckCompanion(MESSENGER_COMPANION)),
        component: MessengerCompanion,
        props: ({ data }) => ({ attendableId: data.id }),
      }),
    ]),
  ),
);
