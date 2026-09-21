//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { RangeList, SheetArticle } from '#containers';
import { Sheet } from '#types';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'sheet',
          // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
          filter: AppSurface.oneOf(
            AppSurface.object(AppSurface.Article, Sheet.Sheet, (data) => !!Obj.getDatabase(data.subject)),
            AppSurface.object(AppSurface.Section, Sheet.Sheet, (data) => !!Obj.getDatabase(data.subject)),
          ),
          component: SheetArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
        Surface.create({
          id: 'objectProperties',
          filter: AppSurface.object(AppSurface.ObjectProperties, Sheet.Sheet),
          component: RangeList,
          props: ({ data: { subject } }) => ({ sheet: subject }),
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties', 'org.dxos.role.section'],
  },
);
