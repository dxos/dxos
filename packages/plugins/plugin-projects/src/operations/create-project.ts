//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as CollectionModel from '@dxos/app-toolkit/CollectionModel';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { ProjectCapabilities, ProjectOperation } from '#types';

// Leaf import: the templates barrel pulls `inbox-research` (plugin-inbox/plugin-routine) into the
// bundle, which a worker registering this handler cannot load.
import { defaultTemplate } from '../templates/default.ts';

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
      // collection, starter routines all parented).
      const draft = yield* template
        .scaffold({ name, subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db)));
      invariant(Obj.instanceOf(Project.Project, draft), 'Expected a Project.');

      // Persisted and filed here rather than through `SpaceOperation.AddObject`: the scaffold's
      // children are unsaved objects held in the draft's link cache, which only `Database.add`
      // cascades, and the EDGE runtime backs every `Operation.invoke` with a remote worker call
      // that serializes its input. Across that boundary the cache is dropped and the project
      // persists alone, holding refs to children that were never created (DX-1296).
      yield* Database.add(draft);
      yield* CollectionModel.add({ object: draft });

      const nodePath = GraphPath.getSpacePath(
        db.spaceId,
        GraphPath.GroupSegments.ai,
        Type.getTypename(Project.Project),
      );
      return {
        id: Obj.getURI(draft),
        subject: [GraphPath.getCollectionObjectPath(nodePath, draft.id)],
        project: draft,
      };
    }),
  ),
);

export default handler;
