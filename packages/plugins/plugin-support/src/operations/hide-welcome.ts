//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Annotation, Obj } from '@dxos/echo';

import { WelcomeDismissedAnnotation } from '../annotations';
import * as HelpOperation from '../types/HelpOperation';

const handler: Operation.WithHandler<typeof HelpOperation.HideWelcome> = HelpOperation.HideWelcome.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      if (!space.properties) {
        return;
      }
      Obj.update(space.properties, (properties) => Annotation.set(properties, WelcomeDismissedAnnotation, true));
    }),
  ),
);

export default handler;
