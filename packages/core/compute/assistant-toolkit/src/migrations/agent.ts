//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Instructions, Project } from '@dxos/compute';
import { Collection, Database, JsonSchema, Migration, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { URI } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { syncAgentAutomation } from '../skills/agent-wizard/operations/sync-automation';
import { Agent, Chat } from '../types';

/**
 * Agent `0.1.0` → `0.2.0` (plugin-projects PLAN.md phase D): the agent becomes an identity/preset.
 *
 * - `instructions` targeting a bare `Text` are wrapped into a typed `Instructions` object.
 * - Inline `artifacts` move into a Collection on a Project created for the agent.
 * - The primary `chat` is reparented under that Project and gains the `agent`/`instructions` refs.
 * - `subscriptions`/`cron` replay through the routine compiler (`syncAgentAutomation`).
 * - `feed`/`filterEvents` (the retired qualifier pipeline) are dropped.
 */
/** Refs on migration snapshots arrive in encoded form; accept both that and a live Ref. */
const EncodedRef = Schema.Struct({ '/': Schema.String });
const refDxn = (ref: unknown): URI.URI | undefined =>
  Ref.isRef(ref) ? ref.uri : Schema.is(EncodedRef)(ref) ? URI.make(ref['/']) : undefined;

export const agentMigration = Migration.define({
  from: Agent.LegacyAgent,
  to: Agent.Agent,
  transform: async (from, { db }) => {
    // Wrap a pre-phase-A bare Text into a typed Instructions; keep an already-typed ref as-is.
    let instructions: Ref.Ref<Instructions.Instructions>;
    const instructionsDxn = refDxn(from.instructions);
    const target = instructionsDxn
      ? await db
          .makeRef<Obj.Unknown>(instructionsDxn)
          .load()
          .catch(() => undefined)
      : undefined;
    if (target && Obj.instanceOf(Instructions.Instructions, target)) {
      instructions = Ref.make(target);
    } else if (target && Obj.instanceOf(Text.Text, target)) {
      const wrapped = db.add(
        Obj.make(Instructions.Instructions, {
          text: Ref.make(target),
          skills: [],
          input: JsonSchema.toJsonSchema(Schema.Void),
          output: JsonSchema.toJsonSchema(Schema.Void),
        }),
      );
      instructions = Ref.make(wrapped);
    } else {
      instructions = Ref.make(db.add(Instructions.make({ text: '' })));
    }

    return {
      name: from.name,
      did: from.did,
      enabled: from.enabled,
      instructions,
    };
  },
  onMigration: async ({ before, object: agent, db }) => {
    const program = Effect.gen(function* () {
      // Durable work products move to a Project owned by (named after) the agent.
      const artifactRefs = before.artifacts
        .map((artifact) => refDxn(artifact.data))
        .filter((dxn): dxn is URI.URI => dxn !== undefined)
        .map((dxn) => db.makeRef<Obj.Unknown>(dxn));
      if (artifactRefs.length > 0) {
        const collection = yield* Database.add(Collection.make({ objects: artifactRefs }));
        const project = yield* Database.add(
          Project.make({ name: before.name ?? 'Agent', artifacts: Ref.make(collection) }),
        );
        Obj.setParent(collection, project);
      }

      // Invert the chat linkage: the chat references its agent and steering instructions.
      const chatDxn = refDxn(before.chat);
      if (chatDxn) {
        const chat = yield* Database.resolve(chatDxn).pipe(Effect.orElseSucceed(() => undefined));
        if (chat && Obj.instanceOf(Chat.Chat, chat)) {
          Obj.update(chat, (chat) => {
            chat.agent = Ref.make(agent);
            if (!chat.instructions) {
              chat.instructions = agent.instructions;
            }
          });
        }
      }

      // Replay legacy automation through the routine compiler (relay pattern).
      const subscriptionRefs = before.subscriptions
        .map((ref) => refDxn(ref))
        .filter((dxn): dxn is URI.URI => dxn !== undefined)
        .map((dxn) => db.makeRef<Obj.Unknown>(dxn));
      if (subscriptionRefs.length > 0 || before.cron) {
        yield* syncAgentAutomation(agent, {
          subscriptions: subscriptionRefs,
          cron: before.cron,
          qualify: before.filterEvents ?? true,
        });
      }

      yield* Database.flush();
    });

    await EffectEx.runAndForwardErrors(program.pipe(Effect.provide(Database.layer(db))));
  },
});
