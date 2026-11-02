//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Project from '@dxos/compute/Project';
import { Database, Obj } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

/**
 * The instructions travel by reference, so the chat follows later edits to the project's. Instructions that no longer
 * exist bind nothing.
 */
const projectBindings = Effect.fnUntraced(function* (
  project: Project.Project,
): Effect.fn.Return<AssistantCapabilities.SubjectBindings> {
  const instructions = project.instructions;
  if (!instructions) {
    return {};
  }

  // Loaded rather than probed for availability: `contextBindings` reads `.target`.
  const loaded = yield* Database.load(instructions).pipe(
    Effect.as(true),
    Effect.catchTag('EntityNotFoundError', () => Effect.succeed(false)),
  );
  return loaded ? { ...Project.contextBindings(project), instructions } : {};
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(AssistantCapabilities.SubjectContext, {
        appliesTo: Obj.instanceOf(Project.Project),
        getBindings: Effect.fnUntraced(function* ({ subject }) {
          return Obj.instanceOf(Project.Project, subject) ? yield* projectBindings(subject) : {};
        }),
      }),
    ];
  }),
);
