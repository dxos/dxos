//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';

import { AtprotoCompanion, PdsBrowser } from '#containers';

import { getRecordAnnotation } from '../annotation.ts';
import { isPdsSubject } from '../pds.ts';
import { ATPROTO_COMPANION_VARIANT } from './app-graph-builder.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'atprotoCompanion',
        // Bound to its own companion variant (`atproto`) so it does not also match other companions
        // of the same object (e.g. a book's notes).
        filter: AppSurface.allOf(
          AppSurface.subject(
            AppSurface.Article,
            (subject): subject is Obj.Unknown => Obj.isObject(subject) && !!getRecordAnnotation(subject),
          ),
          AppSurface.companion(AppSurface.Article),
          Surface.Root.makeFilter(AppSurface.Article, (data) => data.variant === ATPROTO_COMPANION_VARIANT),
        ),
        component: AtprotoCompanion,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'pdsBrowser',
        filter: AppSurface.subject(AppSurface.Article, isPdsSubject),
        component: PdsBrowser,
        props: ({ role, data: { subject } }) => ({ role, db: subject.db }),
      }),
    ]),
  ),
);
