//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { createAgentWithIdentity } from './create-agent.ts';

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
        createAgentWithIdentity(options.db, { name: props.name?.trim() ?? '' }).pipe(
          Effect.map((object) => ({ id: object.id, object })),
        ),
    });
  }),
);
