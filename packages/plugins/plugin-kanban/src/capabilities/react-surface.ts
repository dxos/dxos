//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { SchemaEx } from '@dxos/effect';
import { Position } from '@dxos/util';

import { KanbanArticle, KanbanProperties } from '#containers';
import { Kanban } from '#types';

import { PivotColumnAnnotationId } from '../types/KanbanSchema.ts';
import { PivotColumnField } from './PivotColumnField.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Kanban.Kanban),
          AppSurface.object(AppSurface.Section, Kanban.Kanban),
        ),
        component: KanbanArticle,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, Kanban.Kanban),
        component: KanbanProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: 'createInitialSchemaForm',
        filter: AppSurface.formInputBySchema((ast) => !!SchemaEx.findAnnotation<boolean>(ast, PivotColumnAnnotationId)),
        component: PivotColumnField,
      }),
    ]),
  ),
);
