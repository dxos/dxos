//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Chat from '@dxos/assistant/Chat';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { AnchoredTo, Message, Thread } from '@dxos/types';
import { trim } from '@dxos/util';

import { AssistantOperation } from '#types';

import { CommentThreadNotPersistedError } from '../errors.ts';

/**
 * Runs a comment thread's agent turns as ordinary assistant turns: one chat per thread, parented to the thread and
 * running on the thread's own feed, with the commented object bound so its type's skills apply. A run returns once the
 * turn has settled.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const invoker = yield* Capabilities.OperationInvoker;

    const runner: AppCapabilities.CommentAgentRunner = {
      run: ({ thread, subject, message }) =>
        Effect.gen(function* () {
          const db = Obj.getDatabase(thread);
          if (!db) {
            return yield* Effect.fail(new CommentThreadNotPersistedError());
          }
          const spaceId = db.spaceId;
          const feed = yield* Effect.promise(() => thread.feed.load());

          const children = yield* Effect.promise(() => db.query(Query.select(Filter.id(thread.id)).children()).run());
          let chat = children.find(Obj.instanceOf(Chat.Chat));
          if (!chat) {
            const { object } = yield* invoker.invoke(
              AssistantOperation.CreateChat,
              { name: thread.name, feed },
              { spaceId },
            );
            chat = db.add(object);
            // The thread's companion: parented to it (and referenced from it), so it is deleted with the thread and
            // stays out of the space's chat lists.
            Chat.linkCompanion({ chat, subject: thread });
          }
          yield* invoker.invoke(AssistantOperation.BindChatContext, { chat, subject }, { spaceId });

          const resolvers = yield* Capability.getAll(AppCapabilities.AnchorResolver);
          const anchorText = yield* Effect.promise(() => resolveAnchorText(thread, subject, resolvers));
          yield* invoker.invoke(
            AssistantOperation.RunPromptInChat,
            { chat, disposition: 'synthetic', prompt: commentPrompt({ subject, message, anchorText }), wait: true },
            { spaceId },
          );
        }),
    };

    return Capability.contribute(AppCapabilities.CommentAgentRunner, runner);
  }),
);

/** The text the thread's anchor spans, for subject types that resolve cursor-range anchors. */
const resolveAnchorText = async (
  thread: Thread.Thread,
  subject: Obj.Unknown,
  resolvers: readonly AppCapabilities.AnchorResolver[],
): Promise<string | undefined> => {
  const db = Obj.getDatabase(thread);
  if (!db) {
    return undefined;
  }
  const anchors: AnchoredTo.AnchoredTo[] = await db
    .query(Query.select(Filter.id(thread.id)).sourceOf(AnchoredTo.AnchoredTo))
    .run();
  const anchor = anchors.find((anchor) => Relation.getTarget(anchor).id === subject.id)?.anchor;
  const resolver = resolvers.find(({ key }) => key === Obj.getTypename(subject));
  return anchor ? resolver?.getText(subject, anchor) : undefined;
};

/** The hidden prompt that starts a turn; the comment itself is already in the feed as the user's message. */
const commentPrompt = ({
  subject,
  message,
  anchorText,
}: {
  subject: Obj.Unknown;
  message: Message.Message;
  anchorText?: string;
}): string => trim`
  You are replying in a comment thread on the ${Obj.getTypename(subject) ?? 'object'} "${Obj.getLabel(subject) ?? subject.id}" ({"/": "${Obj.getURI(subject)}"}).
  ${anchorText ? `The thread is attached to this part of it:\n<selection>\n${anchorText}\n</selection>` : 'The thread is about the object as a whole.'}
  Respond to this latest comment${message.sender.name ? ` from ${message.sender.name}` : ''}:
  <comment>
  ${textOf(message)}
  </comment>
  A request to change the content - translate, rewrite, fix, shorten, extend, add or remove something - is a request
  to edit the object in place: ${anchorText ? 'replace the text in <selection> (and nothing else) ' : 'change the object '}with your tools, and do not paste the new content into the reply.
  Your final message is posted to the thread as your reply, as it is: after an edit, say in one line what you changed;
  for a question, answer in under 80 words.
`;

const textOf = (message: Message.Message): string =>
  message.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join('\n');
