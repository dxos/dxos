//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { userEvent, waitFor, within } from 'storybook/test';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Database, type Obj, Ref } from '@dxos/echo';
import * as CanvasType from '@dxos/plugin-canvas/Canvas';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { translations as illustratorTranslations } from '@dxos/plugin-illustrator/translations';
import * as MarkdownType from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { translations as markdownTranslations } from '@dxos/plugin-markdown/translations';
import * as CommentOperation from '@dxos/plugin-review/CommentOperation';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import { translations as reviewTranslations } from '@dxos/plugin-review/translations';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import { type Space } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';
import { Cell, type ModuleLayout, UpdateCompanionStubPlugin, addToRootCollection } from '@dxos/storybook-testing';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { StorySettingsToolbar } from '../modules/index.ts';
import {
  type DecoratorsProps,
  FAKE_REPLY,
  ModuleContainer,
  createDecorators,
  defaultEdgeEnvironment,
  edgeFake,
  fakeCommentAgent,
  storyConfig,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = {
  /** Keeps the profile (space, threads, hidden chats) across reloads; a change reboots the story. */
  persistent?: boolean;
};

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-agent/CommentAgent',
  // The layout is the runtime one `onInit` returns.
  render: (_args, { parameters }) => (
    <Panel.Root>
      <Panel.Header>
        <StorySettingsToolbar />
      </Panel.Header>
      {/* `ModuleContainer` pins itself to its nearest positioned ancestor, so the body is that ancestor. */}
      <Panel.Body classNames='relative'>
        <ModuleContainer columns={parameters.columns} />
      </Panel.Body>
    </Panel.Root>
  ),
  parameters: {
    ...storyParameters,
    columns: '2fr_1fr',
    translations: [
      ...storyParameters.translations,
      ...illustratorTranslations,
      ...markdownTranslations,
      ...reviewTranslations,
    ],
  },
  argTypes: { persistent: { control: 'boolean' } },
  args: { persistent: false },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * The objects a comment can be left on, the review plugin that owns the threads, and the space it persists them in.
 * Without an `agentRunner` the review plugin uses the one the assistant contributes.
 */
const commentPlugins = (agentRunner?: AppCapabilities.CommentAgentRunner) => [
  SpacePlugin.make({}),
  MarkdownPlugin.make(),
  IllustratorPlugin.make(),
  CanvasPlugin.make(),
  ReviewPlugin.make({ agentRunner }),
  UpdateCompanionStubPlugin(),
];

const commentTypes = [
  Drawing.Drawing,
  Drawing.Canvas,
  MarkdownType.Document,
  Thread.Thread,
  Message.Message,
  AnchoredTo.AnchoredTo,
];

/**
 * The object's article, its comments companion and, with the real agent, the assistant's trace, each in its own module.
 * Filing the object in the root collection gives it the app-graph node the article toolbar's comment action attaches to.
 */
const commentLayout = (space: Space, object: Obj.Unknown, trace: boolean): ModuleLayout => {
  addToRootCollection(space, [object]);
  return [
    [Cell.article(object)],
    [Cell.companion(object, 'comments')],
    ...(trace ? [[AppSurface.deckCompanion('trace')]] : []),
  ];
};

/**
 * Leaves an opening comment on `subject`, so the story starts with a thread to reply to: on the text `range` when given
 * (a highlighted span in a document), else on the object as a whole.
 */
const seedComment = async ({
  db,
  invoker,
  subject,
  text,
  range,
}: {
  db: Database.Database;
  invoker: Capabilities.OperationInvoker;
  subject: Obj.Unknown;
  text: string;
  range?: { from: number; to: number };
}) => {
  await db.flush({ indexes: true });
  await invoker.invokePromise(
    CommentOperation.Create,
    { subject, ...(range ? { range } : { anchor: Date.now().toString() }), text, sender: { name: 'Alice' } },
    { spaceId: db.spaceId },
  );
};

const RELEASE_NOTES = '# Release notes\n\nComment threads now run on feeds, and the assistant answers them.\n';
const COMMENTED = 'the assistant answers them';

type Subject = Pick<DecoratorsProps, 'onInit' | 'onReady'>;

/** Builds a story's subject; `trace` adds the assistant's trace column, which only the real agent's stack provides. */
type SubjectFactory = (options: { trace: boolean }) => Subject;

/**
 * The story's object, created in `onInit` and commented on in `onReady`. Handed over directly rather than queried,
 * since a query right after boot can miss an object the index has not caught up with.
 */
const makeSubject = <T extends Obj.Unknown>({
  create,
  prepare,
  text,
  range,
  trace,
}: {
  trace: boolean;
  create: (space: Space) => T;
  /** Fills the object through its plugin's operations before the comment is left on it. */
  prepare?: (props: { db: Database.Database; invoker: Capabilities.OperationInvoker; subject: T }) => Promise<void>;
  text: string;
  range?: { from: number; to: number };
}): Subject => {
  let subject: T | undefined;
  return {
    onInit: async ({ space }) => {
      subject = create(space);
      return commentLayout(space, subject, trace);
    },
    onReady: async ({ db, invoker }) => {
      if (subject) {
        await prepare?.({ db, invoker, subject });
        await seedComment({ db, invoker, subject, text, range });
      }
    },
  };
};

/** A Markdown document with a comment anchored to a phrase. */
const markdownSubject: SubjectFactory = ({ trace }) =>
  makeSubject({
    trace,
    create: (space) => space.db.add(MarkdownType.make({ name: 'Release notes', content: RELEASE_NOTES })),
    text: 'Is this clear enough for users?',
    range: { from: RELEASE_NOTES.indexOf(COMMENTED), to: RELEASE_NOTES.indexOf(COMMENTED) + COMMENTED.length },
  });

/** An instruction to the agent, so a story with the real agent starts with a turn in progress. */
const CANVAS_INSTRUCTION = '@kai add a box C connected from B';

/** `A → B` with boxes sized to the canvas's 64px major grid, so every edge lands on a grid line. */
const CANVAS_SOURCE = 'diagram box=128x128\nnode A "A"\nnode B "B" right-of A\nedge A -> B';

/** A canvas drawing of `A → B`, with a comment asking the agent to extend it. */
const canvasSubject: SubjectFactory = ({ trace }) =>
  makeSubject({
    trace,
    create: (space) => {
      const canvas = space.db.add(Drawing.makeCanvas({ schema: CanvasType.SCENE_SCHEMA }));
      return space.db.add(Drawing.make({ name: 'Architecture', canvas }));
    },
    prepare: async ({ db, invoker, subject }) => {
      await invoker.invokePromise(
        DrawingOperation.Draw,
        { drawing: Ref.make(subject), source: CANVAS_SOURCE },
        { spaceId: db.spaceId },
      );
    },
    text: CANVAS_INSTRUCTION,
  });

/** Article, comments and trace. */
const TRACE_COLUMNS = '2fr_1fr_1fr';

/** No EDGE and no agent stack: the fake runner answers, so the story runs offline. */
const fakeDecorators = (subject: SubjectFactory) =>
  createDecorators<StoryArgs>({
    config: edgeFake,
    agents: false,
    plugins: commentPlugins(fakeCommentAgent),
    types: commentTypes,
    ...subject({ trace: false }),
  });

/**
 * The assistant answers through the review plugin's default (mention) mode, on the EDGE the toolbar picks: dev until
 * one is chosen, since without a reachable EDGE the agent's model calls fail and no reply ever appears.
 */
const liveDecorators = (subject: SubjectFactory) =>
  createDecorators<StoryArgs>(({ args }) => {
    defaultEdgeEnvironment('dev');
    return {
      config: storyConfig({ persistent: args.persistent }),
      plugins: commentPlugins(),
      types: commentTypes,
      ...subject({ trace: true }),
    };
  });

/**
 * Replies `text` in the seeded thread and waits for the agent's answer: `reply` matches the fake assistant's text, or,
 * when omitted, any message authored by Kai (the real agent's wording is not fixed).
 */
const replyAndAwaitAgent =
  ({ text, reply, timeout = 30_000 }: { text: string; reply?: RegExp; timeout?: number }) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const thread = await canvas.findByTestId('thread', undefined, { timeout: 30_000 });
    const composer = await waitFor(
      () => {
        const editors = thread.querySelectorAll<HTMLElement>('[contenteditable="true"]');
        const editor = editors[editors.length - 1];
        if (!editor) {
          throw new Error('reply composer not rendered');
        }
        return editor;
      },
      { timeout: 30_000 },
    );
    // Counted before posting, since the seeded comment may already have a reply.
    const replies = () =>
      reply ? canvas.queryAllByText(reply).length : canvas.queryAllByText('Kai', { exact: true }).length;
    const before = replies();
    await userEvent.click(composer);
    await userEvent.keyboard(text);
    // Enter accepts an open `@` completion instead of sending, so wait for the popup to close on the typed text.
    await waitFor(() => {
      if (canvasElement.ownerDocument.querySelector('.cm-tooltip-autocomplete')) {
        throw new Error('mention completion still open');
      }
    });
    await userEvent.keyboard('{Enter}');
    await awaitAgent(canvasElement, () => replies() > before, timeout);
  };

/**
 * Waits for the agent's reply: `replied` holds, and the pending message (posted in Kai's name while a turn runs) has
 * given way to the real one.
 */
const awaitAgent = (canvasElement: HTMLElement, replied: () => boolean, timeout: number) =>
  waitFor(
    () => {
      if (!replied() || within(canvasElement).queryByText(PENDING)) {
        // The thread's text, since the default DOM dump is cut off before the companion.
        const thread = canvasElement.querySelector('[data-testid="thread"]')?.textContent ?? '(no thread)';
        throw new Error(`the agent has not replied yet: ${thread}`);
      }
    },
    { timeout },
  );

/** The pending message plugin-review shows while the agent works. */
const PENDING = /Working on it/;

/** The comment that once went unanswered: a lowercase mention asking for an edit of the anchored text. */
const TRANSLATE = '@kai translate this into japanese';

/**
 * A comment on a Markdown document, answered by a fake assistant (no EDGE).
 *
 * Try:
 * 1. Reply `@kai translate this into japanese` (the play does): the fake assistant answers in the thread.
 * 2. Reply without `@Kai`: nothing answers (the comment agent mode is `mention`).
 * 3. Select text and click the toolbar's comment button: a new thread anchored to the selection opens.
 */
export const Markdown: Story = {
  decorators: fakeDecorators(markdownSubject),
  play: replyAndAwaitAgent({ text: TRANSLATE, reply: new RegExp(`^${FAKE_REPLY}$`) }),
};

/**
 * A comment on a canvas drawing, answered by a fake assistant (no EDGE).
 *
 * Try:
 * 1. Reply `@Kai hello`: the fake assistant answers in the thread.
 */
export const Canvas: Story = {
  decorators: fakeDecorators(canvasSubject),
  // The seeded comment mentions Kai, so its turn settles first; a reply posted mid-turn would race it.
  play: async (context) => {
    const reply = new RegExp(`^${FAKE_REPLY}$`);
    await awaitAgent(
      context.canvasElement,
      () => within(context.canvasElement).queryAllByText(reply).length > 0,
      30_000,
    );
    await replyAndAwaitAgent({ text: '@kai hello', reply })(context);
  },
};

/**
 * A comment on a Markdown document, answered by the real assistant with the markdown skills. Pick an EDGE in the
 * toolbar (see the package README).
 *
 * The play replies `@kai translate this into japanese` and waits for Kai to translate the commented phrase in place
 * and say so; a turn takes up to a minute.
 *
 * Try:
 * 1. Reply `@Kai summarise this document in one sentence`: Kai answers in the thread.
 * 2. Reply `@Kai add a closing paragraph`: Kai edits the document and says what it changed.
 */
export const MarkdownAgent: Story = {
  decorators: liveDecorators(markdownSubject),
  parameters: { columns: TRACE_COLUMNS },
  play: async (context) => {
    await replyAndAwaitAgent({ text: TRANSLATE, timeout: 120_000 })(context);
    // A translation is an edit in place: the anchored English phrase leaves the document, and the comment stays on the
    // text that replaced it.
    await waitFor(
      () => {
        if (context.canvasElement.querySelector('.cm-content')?.textContent?.includes(COMMENTED)) {
          throw new Error('the commented phrase was not translated in place');
        }
        if (!context.canvasElement.querySelector('.cm-comment')?.textContent) {
          throw new Error('the comment lost its range');
        }
      },
      { timeout: 30_000 },
    );
  },
  tags: ['!test'],
};

/**
 * A canvas drawing of `A → B` whose seeded comment asks Kai to add `C`: the real assistant answers it on load with the
 * illustrator's skills (pick an EDGE in the toolbar; dev by default).
 *
 * Try:
 * 1. Wait for Kai: C appears on the canvas, connected from B, and Kai says so in one line.
 * 2. Reply `@Kai what is this diagram about?`: Kai answers in the thread.
 */
export const CanvasAgent: Story = {
  decorators: liveDecorators(canvasSubject),
  parameters: { columns: TRACE_COLUMNS },
  // The seeded comment is the instruction; the play only waits for Kai's reply to it.
  play: async ({ canvasElement }) => {
    await awaitAgent(
      canvasElement,
      () => within(canvasElement).queryAllByText('Kai', { exact: true }).length > 0,
      120_000,
    );
  },
  tags: ['!test'],
};
