//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiPreprocessor, AiService } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { ServiceResolver } from '@dxos/compute';
import { Filter, Obj, Ref, Relation } from '@dxos/echo';
import { getRangeFromCursor, toCursorRange, updateText } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { AnchoredTo, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { AgentIdentity, CommentCapabilities } from '../types';

const DEFAULT_MODEL = DXN.make('com.anthropic.model.claudeSonnet46');

const baseInstructions = trim`
  You are a helpful assistant participating in a comment thread on a document.
  Read the document and the conversation history; the user's requests usually
  refer to the document content.

  When the user asks you to MODIFY the document (translate, rewrite, edit, fix,
  refactor, etc.) call ONE of the edit tools. Do NOT paste the new content into
  chat — always use the tool.

  - If the thread has an anchored selection (shown in <selection>...</selection>
    below), use \`editAnchoredRange\` with ONLY the replacement text for that
    span. Leave the rest of the document untouched.
  - If there is no anchored selection, use \`updateDocument\` with the FULL new
    markdown content.

  AFTER calling an edit tool you MUST also produce a chat reply that:
    1. States in one line what you changed (e.g. "Translated the selection to
       Japanese.");
    2. Optionally adds one or two sentences explaining notable choices,
       caveats, or suggesting a follow-up. Keep the whole reply under 60 words.
    3. Does NOT repeat the new document content — it's already shown in the
       editor on the left.

  When the user asks a QUESTION (or just chats), reply in plain text under
  80 words and do not call any edit tool.

  Do not address the user as 'user'; use their name if known. Never call yourself.
`;

const EditAnchoredRangeTool = Tool.make('editAnchoredRange', {
  description:
    'Replace the text of the anchored selection in the markdown document. Call this for in-place edits when a <selection> is provided.',
  parameters: {
    replacement: Schema.String.annotations({
      description: 'The new text for the anchored range. Only this span will be replaced.',
    }),
  },
  success: Schema.String,
});

const UpdateDocumentTool = Tool.make('updateDocument', {
  description:
    'Replace the entire markdown content of the document. Call this for in-place edits when there is no anchored selection.',
  parameters: {
    content: Schema.String.annotations({
      description: 'The full new markdown content of the document.',
    }),
  },
  success: Schema.String,
});

type EditTarget =
  | {
      kind: 'anchored';
      text: Obj.Any;
      snippet: string;
      from: number;
      to: number;
      relation: AnchoredTo.AnchoredTo;
    }
  | { kind: 'document'; text: Obj.Any }
  | { kind: 'none' };

/**
 * Resolve the agent's edit target for this turn:
 *  - 'anchored' when the thread is anchored to a span of the doc — agent edits
 *    only that span via `editAnchoredRange`.
 *  - 'document' when the subject is a Markdown.Document but the thread has no
 *    anchor — agent may replace the whole doc via `updateDocument`.
 *  - 'none' when the subject isn't editable text — no edit tools wired.
 */
const resolveEditTarget = (thread: Obj.Any, subject: Obj.Any): EditTarget => {
  if (!Obj.instanceOf(Markdown.Document, subject)) {
    return { kind: 'none' };
  }
  const text = subject.content?.target;
  if (!text) {
    return { kind: 'none' };
  }
  const db = Obj.getDatabase(thread);
  if (!db) {
    return { kind: 'document', text };
  }
  const relations = db.query(Filter.type(AnchoredTo.AnchoredTo)).runSync();
  const ours = relations.find(
    (relation: AnchoredTo.AnchoredTo) =>
      Relation.getSource(relation) === thread && Relation.getTarget(relation) === subject,
  );
  if (!ours?.anchor) {
    return { kind: 'document', text };
  }
  try {
    const accessor = Doc.createAccessor(text, ['content']);
    const range = getRangeFromCursor(accessor, ours.anchor);
    if (!range || range.start === range.end) {
      return { kind: 'document', text };
    }
    const content = (text as unknown as { content: string }).content ?? '';
    return {
      kind: 'anchored',
      text,
      from: range.start,
      to: range.end,
      snippet: content.slice(range.start, range.end),
      relation: ours,
    };
  } catch (err) {
    log.warn('failed to resolve anchored range; falling back to whole-document edit', { error: err });
    return { kind: 'document', text };
  }
};

/**
 * Build the system prompt for a turn. Inlines the doc content and, when the
 * thread is anchored, the highlighted snippet so the agent can target just
 * that span.
 */
const buildInstructions = (subject: Obj.Any, target: EditTarget): string => {
  if (!Obj.instanceOf(Markdown.Document, subject)) {
    return baseInstructions;
  }
  const content = subject.content?.target?.content ?? '';
  if (!content) {
    return baseInstructions;
  }
  const selectionBlock = target.kind === 'anchored' ? `\n\n<selection>\n${target.snippet}\n</selection>` : '';
  return trim`
    ${baseInstructions}

    <document name="${subject.name ?? 'untitled'}">
    ${content}
    </document>${selectionBlock}
  `;
};

/**
 * Normalises messages for the LLM prompt: user-authored messages in comment
 * threads carry no explicit role (only assistant messages do), but the prompt
 * preprocessor switches on `role` and drops anything that isn't 'user' or
 * 'assistant'. Stamp `role: 'user'` on every non-assistant turn before
 * preprocessing.
 */
const normalizeRoles = (messages: readonly Message.Message[]): Message.Message[] =>
  messages.map((message) =>
    message.sender.role === 'assistant'
      ? message
      : { ...message, sender: { ...message.sender, role: 'user' as const } },
  );

/**
 * Default AgentRunner: one-shot LLM call per scheduled turn — loads the thread, builds a prompt
 * from the message history, generates a reply via `LanguageModel.generateText`, and appends the
 * response as an assistant message on the same thread. Edit tools (`editAnchoredRange`,
 * `updateDocument`) are wired per turn based on whether the thread has an anchored range; splicing
 * uses Automerge-diff `updateText` so anchors on other threads stay valid. Storybook stub paths
 * contribute their own `AgentRunner` earlier in plugin order to short-circuit this module.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const runner: CommentCapabilities.AgentRunner = {
      run: ({ thread, subject }) =>
        Effect.gen(function* () {
          const db = Obj.getDatabase(thread);
          if (!db) {
            log.warn('comment-thread agent runner: thread has no database; skipping turn');
            return;
          }
          const serviceResolver = yield* Capability.get(Capabilities.ServiceResolver);
          const aiServiceLayer = ServiceResolver.provide({ space: db.spaceId }, AiService.AiService).pipe(
            Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, serviceResolver)),
          );
          const identity = yield* Capability.get(AgentIdentity);

          // Load every referenced message into a plain Message.Message[].
          const loaded = yield* Effect.forEach(
            thread.messages,
            (messageRef) => Effect.promise(() => messageRef.load()),
            { concurrency: 'unbounded' },
          );
          const history = normalizeRoles(loaded);

          const target = resolveEditTarget(thread, subject);
          const prompt = yield* AiPreprocessor.preprocessPrompt(history, {
            system: buildInstructions(subject, target),
          });

          // Capture which edit tool fired so we can synthesize a fallback chat
          // ack when the model elides the post-tool message.
          let editOutcome: 'anchored' | 'document' | undefined;

          const toolkit = Toolkit.make(EditAnchoredRangeTool, UpdateDocumentTool);
          const toolkitLayer = toolkit.toLayer({
            editAnchoredRange: ({ replacement }) =>
              Effect.sync(() => {
                if (target.kind !== 'anchored') {
                  return 'No anchored selection on this thread; use updateDocument instead.';
                }
                const original = (target.text as unknown as { content: string }).content ?? '';
                const next = original.slice(0, target.from) + replacement + original.slice(target.to);
                updateText(target.text, ['content'], next);

                // Cursor at `to` (left-associated) can collapse to `from` after a
                // delete-and-insert at that range, leaving the comment's anchor
                // pointing at a zero-width span. Rewrite AnchoredTo.anchor to
                // span the newly-inserted text so the editor marker continues
                // to highlight the replaced range.
                const newTo = target.from + replacement.length;
                const accessor = Doc.createAccessor(target.text, ['content']);
                const newAnchor = toCursorRange(accessor, target.from, newTo);
                Relation.update(target.relation, (relation) => {
                  (relation as Relation.Mutable<AnchoredTo.AnchoredTo>).anchor = newAnchor;
                });
                editOutcome = 'anchored';
                return 'Anchored range replaced.';
              }),
            updateDocument: ({ content }) =>
              Effect.sync(() => {
                if (target.kind === 'none') {
                  return 'No editable document in scope.';
                }
                updateText(target.text, ['content'], content);
                editOutcome = 'document';
                return 'Document updated.';
              }),
          });

          const response = yield* LanguageModel.generateText({ prompt, toolkit }).pipe(
            Effect.scoped,
            Effect.provide(AiService.model(DEFAULT_MODEL).pipe(Layer.provide(aiServiceLayer))),
            Effect.provide(toolkitLayer),
          );

          // The chat message defaults to whatever the model returned, but when
          // the model elided its post-tool reply (some providers do) fall back
          // to a synthesized ack so the thread always reflects that something
          // happened.
          const fallbackByOutcome: Record<'anchored' | 'document', string> = {
            anchored: 'Updated the highlighted selection.',
            document: 'Updated the document.',
          };
          const text =
            response.text.trim().length > 0 ? response.text : editOutcome ? fallbackByOutcome[editOutcome] : '';
          if (text.length === 0) {
            // Nothing to say and nothing was edited — don't post a hollow bubble.
            return;
          }

          const reply = Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant', name: identity.name, identityDid: identity.identityDid },
            blocks: [{ _tag: 'text', text }],
          });
          Obj.update(thread, (thread) => {
            (thread.messages as Ref.Ref<Message.Message>[]).push(Ref.make(reply));
          });
        }),
    };

    return Capability.contributes(CommentCapabilities.AgentRunner, runner);
  }),
);
