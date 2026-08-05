//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { GraphPath } from '@dxos/app-toolkit';
import { Operation, Project } from '@dxos/compute';
import { Database, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';

import { ProjectCapabilities, ProjectOperation } from '#types';

// Leaf import: the templates barrel pulls `inbox-research` (plugin-inbox/plugin-routine) into the
// bundle, which a worker registering this handler cannot load.
import { blank } from '../templates/blank';

const handler: Operation.WithHandler<typeof ProjectOperation.Create> = ProjectOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, templateId, subject }) {
      const { db } = yield* Database.Service;

      // Contributed templates plus the built-in blank fallback, so the operation works even before
      // (or without) the plugin's own template module activating.
      const contributed = yield* Capability.getAll(ProjectCapabilities.Template);
      const templates = contributed.some((template) => template.id === ProjectCapabilities.BlankTemplateId)
        ? contributed
        : [...contributed, blank];
      const template = templates.find((entry) => entry.id === (templateId ?? ProjectCapabilities.BlankTemplateId));
      invariant(template, `Unknown project template: ${templateId}`);

      // The scaffold returns a fully-wired in-memory project graph (owned instructions, artifacts
      // collection, starter routines all parented); AddObject's `Database.add` cascades the whole graph.
      const draft = yield* template
        .scaffold({ name, subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

      const result = yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
        targetNodeId: GraphPath.getSpacePath(db.spaceId, GraphPath.GroupSegments.ai, Type.getTypename(Project.Project)),
      });
      invariant(Obj.instanceOf(Project.Project, result.object), 'Expected a Project.');
      return { id: result.id, subject: result.subject, project: result.object };
    }),
  ),
);

export default handler;
