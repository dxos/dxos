//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { AgentOperation } from '#types';

/** The create form: an agent is named when it is created, and introduces itself by that name. */
const CreateAgentForm = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name', description: 'What the agent is called.' }),
});

// The Agents section lists a space's agents only once it has one, so "Add to space" is how the first is made.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Agent.Agent),
      inputSchema: CreateAgentForm,
      createObject: (props: Partial<Schema.Schema.Type<typeof CreateAgentForm>>, options) =>
        Effect.gen(function* () {
          const { agent } = yield* Operation.invoke(
            AgentOperation.CreateAgent,
            { name: props.name?.trim() ?? '' },
            { spaceId: options.db.spaceId },
          );
          // The returned ref crossed the operation boundary without a resolver, so it is re-made on the database.
          const object = yield* Effect.promise(() => options.db.makeRef<Agent.Agent>(agent.uri).load());
          return { id: object.id, object };
        }),
    });
  }),
);
