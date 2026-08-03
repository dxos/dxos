//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';

import { blank } from '../templates';
import * as ProjectCapabilities from '../types/ProjectCapabilities';
import * as ProjectOperation from '../types/ProjectOperation';

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
