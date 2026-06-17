//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Annotation, Obj } from '@dxos/echo';
import { Operation } from '@dxos/compute';

import { HelpOperation } from '#types';

import { WelcomeDismissedAnnotation } from '../annotations';

const handler: Operation.WithHandler<typeof HelpOperation.HideWelcome> = HelpOperation.HideWelcome.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      Obj.update(space.properties, (properties) =>
        Annotation.set(properties, WelcomeDismissedAnnotation, true),
      );
    }),
  ),
);

export default handler;
