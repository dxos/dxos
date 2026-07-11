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

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'atprotoCompanion',
        filter: AppSurface.allOf(
          AppSurface.subject(
            AppSurface.Article,
            (subject): subject is Obj.Unknown => Obj.isObject(subject) && !!getRecordAnnotation(subject),
          ),
          AppSurface.companion(AppSurface.Article),
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
