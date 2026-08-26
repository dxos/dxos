//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { AiContext } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { AssistantCapabilities, AssistantEvents, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.BindChatContext> =
  AssistantOperation.BindChatContext.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat, subject }) {
        const db = Obj.getDatabase(subject);
        invariant(db, 'Subject is not in a database.');

        // Activation first: it is what makes a lazy module contribute its provider. Read from the
        // ambient context rather than declared, so a host that binds no plugin manager (a test, the
        // edge operation service) still runs whatever providers are already contributed.
        const pluginManager = yield* Effect.serviceOption(Plugin.Service);
        yield* Option.match(pluginManager, {
          onNone: () => Effect.void,
          onSome: (manager) => manager.activate(AssistantEvents.Start),
        });
        const providers = (yield* Capability.getAll(AssistantCapabilities.SubjectContext)).filter(
          ({ appliesTo }) => appliesTo?.(subject) ?? true,
        );
        if (providers.length === 0) {
          return;
        }

        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        yield* Effect.gen(function* () {
          const contributions = yield* Effect.all(providers.map(({ getBindings }) => getBindings({ subject, chat })));

          // A backfill, not a sync: a chat created with its own instructions keeps them.
          const instructions = contributions.find(({ instructions }) => instructions)?.instructions;
          if (instructions && !chat.instructions) {
            Obj.update(chat, (chat) => {
              chat.instructions = instructions;
            });
          }

          // One merged bind: refs are a set union, and `bind` drops those already in the conversation.
          const skills = contributions.flatMap(({ skills }) => skills ?? []);
          const objects = contributions.flatMap(({ objects }) => objects ?? []);
          if (skills.length === 0 && objects.length === 0) {
            return;
          }

          const feed = yield* Database.load(chat.feed);
          const runtime = yield* Effect.context<Database.Service>();
          const binder = new AiContext.Binder({ feed, runtime, registry });
          yield* Effect.promise(() => binder.use((binder: AiContext.Binder) => binder.bind({ skills, objects })));
        }).pipe(Effect.provide(Database.layer(db)));
      }),
    ),
  );

export default handler;
