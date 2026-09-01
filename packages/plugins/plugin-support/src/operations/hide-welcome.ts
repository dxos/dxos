//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Obj } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { HelpOperation } from '#types';

import { WelcomeDismissedAnnotation } from '../annotations.ts';

const handler: Operation.WithHandler<typeof HelpOperation.HideWelcome> = HelpOperation.HideWelcome.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const settingsSpace = AppSpace.getSettingsSpace(client);
      if (!settingsSpace?.properties) {
        return;
      }
      Obj.update(settingsSpace.properties, (properties) =>
        Annotation.set(properties, WelcomeDismissedAnnotation, true),
      );
    }),
  ),
);

export default handler;
