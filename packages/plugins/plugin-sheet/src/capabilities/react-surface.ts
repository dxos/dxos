//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { RangeList, SheetArticle } from '#containers';
import { Sheet } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
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
);
