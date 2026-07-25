//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Paths } from '@dxos/app-toolkit';
import { Instructions, Operation, Project } from '@dxos/compute';
import { Collection, Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { trim } from '@dxos/util';

/** Default brief seeded into a new Project's agent instructions. */
const DEFAULT_PROJECT_INSTRUCTIONS = trim`
  You are an assistant focused on this project.
  Use its instructions, artifacts, routines, and chats as context to answer questions, summarize activity, and drive its workflows
`;

/** Form fields for creating a Project from the nav menu. */
const CreateProjectSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

/**
 * Contributes the "create Project" entry so a new `Project` can be created from the nav menu (the
 * Projects type-section `+` action). An agent-instructions object and an owned artifacts collection are
 * created and linked with the Project, materialized here at the plugin layer, which can depend on
 * `@dxos/compute`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Project.Project),
      inputSchema: CreateProjectSchema,
      createObject: ({ name }: Schema.Schema.Type<typeof CreateProjectSchema>, options) =>
        Effect.gen(function* () {
          const project = Project.make({ name: name ?? '' });
          // Named so chat context chips and pickers read sensibly (an unnamed Instructions falls back
          // to the typename placeholder).
          const instructions = Instructions.make({ name: 'Instructions', text: DEFAULT_PROJECT_INSTRUCTIONS });
          Obj.setParent(instructions, project);
          const artifacts = Collection.make();
          Obj.setParent(artifacts, project);
          Obj.update(project, (project) => {
            project.instructions = Ref.make(instructions);
            project.artifacts = Ref.make(artifacts);
          });

          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object: project,
            target: options.target,
            targetNodeId: Paths.getSpacePath(
              options.db.spaceId,
              Paths.GroupSegments.ai,
              Type.getTypename(Project.Project),
            ),
          });
        }),
    });
  }),
);
