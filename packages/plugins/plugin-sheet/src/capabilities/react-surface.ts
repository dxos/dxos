//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';

import { ChartArticle, RangeList, SheetArticle, SheetChartsCompanion } from '#containers';
import { Sheet } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'sheet',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Sheet.Sheet, (data) => !!Obj.getDatabase(data.subject)),
          AppSurface.object(AppSurface.Section, Sheet.Sheet, (data) => !!Obj.getDatabase(data.subject)),
          AppSurface.object(AppSurface.Slide, Sheet.Sheet, (data) => !!Obj.getDatabase(data.subject)),
        ),
        component: SheetArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'charts',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'charts'),
          AppSurface.companion(AppSurface.Article, Sheet.Sheet),
        ),
        component: SheetChartsCompanion,
        props: ({ role, data: { companionTo } }) => ({ role, subject: companionTo }),
      }),
      Surface.create({
        id: 'chart',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Sheet.Chart, (data) => !!Obj.getDatabase(data.subject)),
          AppSurface.object(AppSurface.Section, Sheet.Chart, (data) => !!Obj.getDatabase(data.subject)),
          AppSurface.object(AppSurface.Slide, Sheet.Chart, (data) => !!Obj.getDatabase(data.subject)),
        ),
        component: ChartArticle,
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
