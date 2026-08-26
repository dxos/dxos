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
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { ProjectCapabilities, ProjectOperation } from '#types';

// Leaf import: the templates barrel pulls `inbox-research` (plugin-inbox/plugin-routine) into the
// bundle, which a worker registering this handler cannot load.
import { defaultTemplate } from '../templates/default';

const handler: Operation.WithHandler<typeof ProjectOperation.Create> = ProjectOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, templateId, subject }) {
      const { db } = yield* Database.Service;

      // Contributed templates plus the built-in default fallback, so the operation works even before
      // (or without) the plugin's own template module activating.
      const contributed = yield* Capability.getAll(ProjectCapabilities.Template);
      const templates = contributed.some((template) => template.id === ProjectCapabilities.DefaultTemplateId)
        ? contributed
        : [...contributed, defaultTemplate];
      const template = templates.find((entry) => entry.id === (templateId ?? ProjectCapabilities.DefaultTemplateId));
      invariant(template, `Unknown project template: ${templateId}`);

      // The scaffold returns a fully-wired in-memory project graph (owned instructions, artifacts
      // collection, starter routines all parented); AddObject's `Database.add` cascades the whole graph.
      const draft = yield* template
        .scaffold({ name, subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

      const result = yield* Operation.invoke(SpaceOperation.AddObject, { object: draft }, { spaceId: db.spaceId });
      invariant(Obj.instanceOf(Project.Project, result.object), 'Expected a Project.');
      const nodePath = GraphPath.getSpacePath(
        db.spaceId,
        GraphPath.GroupSegments.ai,
        Type.getTypename(Project.Project),
      );
      return {
        id: result.id,
        subject: [GraphPath.getCollectionObjectPath(nodePath, result.object.id)],
        project: result.object,
      };
    }),
  ),
);

export default handler;
