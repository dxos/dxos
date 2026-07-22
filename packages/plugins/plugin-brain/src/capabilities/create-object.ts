//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Paths } from '@dxos/app-toolkit';
import { Instructions, Operation } from '@dxos/compute';
import { Topic } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { trim } from '@dxos/util';

/** Default brief seeded into a new Topic's agent instructions. */
const DEFAULT_TOPIC_INSTRUCTIONS = trim`
  You are an assistant focused on this topic. 
  Use its threads, participants, facts, and tasks as context to answer questions, summarize activity, and drive its workflows
`;

/** Form fields for creating a Topic from the nav menu. */
const CreateTopicSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});

/**
 * Contributes the "create Topic" entry so a new `Topic` can be created from the nav menu (the Topics
 * type-section `+` action). An agent-instructions object is created and linked with the Topic — the
 * Topic type only holds an untyped `Ref` (avoiding a `types → compute` cycle), so the typed
 * `Instructions` object is materialized here, at the plugin layer, which can depend on `@dxos/compute`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.provide(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Topic.Topic),
      inputSchema: CreateTopicSchema,
      createObject: ({ name }: Schema.Schema.Type<typeof CreateTopicSchema>, options) =>
        Effect.gen(function* () {
          const topic = Topic.make({ name: name ?? '' });
          const instructions = Instructions.make({ text: DEFAULT_TOPIC_INSTRUCTIONS });
          Obj.setParent(instructions, topic);
          Obj.update(topic, (topic) => {
            topic.instructions = Ref.make(instructions);
          });

          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object: topic,
            target: options.target,
            targetNodeId: Paths.getSpacePath(options.db.spaceId, Paths.GroupSegments.ai, Type.getTypename(Topic.Topic)),
          });
        }),
    });
  }),
);
