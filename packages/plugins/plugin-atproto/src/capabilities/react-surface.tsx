//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { AtprotoCompanion, PdsBrowser } from '#containers';

import { getRecordAnnotation } from '../annotation';
import { isPdsSubject } from '../pds';
import { ATPROTO_COMPANION_VARIANT } from './app-graph-builder';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'atprotoCompanion',
        // Bound to its own companion segment (`linkedSegment('atproto')`) so it does not also match
        // other companions of the same object (e.g. a book's notes).
        filter: AppSurface.allOf(
          AppSurface.subject(
            AppSurface.Article,
            (subject): subject is Obj.Unknown => Obj.isObject(subject) && !!getRecordAnnotation(subject),
          ),
          AppSurface.companion(AppSurface.Article),
          Surface.makeFilter(AppSurface.Article, (data) => data.variant === ATPROTO_COMPANION_VARIANT),
        ),
        component: ({ data, role }) => (
          <AtprotoCompanion subject={data.subject} role={role} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'pdsBrowser',
        filter: AppSurface.subject(AppSurface.Article, isPdsSubject),
        component: ({ data, role }) => <PdsBrowser role={role} space={data.subject.space} />,
      }),
    ]),
  ),
);
