//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Project from '@dxos/compute/Project';
import { Database, Obj } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    /**
     * A chat in a project's context carries the project's instructions: their skills and context
     * objects as bindings, and the instructions themselves by reference so the chat follows later edits.
     */
    return Capability.contribute(AssistantCapabilities.SubjectContext, {
      appliesTo: Obj.instanceOf(Project.Project),
      getBindings: Effect.fnUntraced(function* ({ subject }) {
        if (!Obj.instanceOf(Project.Project, subject)) {
          return {};
        }

        const instructions = subject.instructions;
        if (!instructions) {
          return {};
        }

        // Loaded rather than probed for availability: `contextBindings` reads `.target`.
        yield* Database.load(instructions);
        return { ...Project.contextBindings(subject), instructions };
      }),
    });
  }),
);
