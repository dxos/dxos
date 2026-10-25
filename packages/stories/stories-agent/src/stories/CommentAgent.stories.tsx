//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { type Database, type Obj, type Type } from '@dxos/echo';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { translations as illustratorTranslations } from '@dxos/plugin-illustrator/translations';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { translations as markdownTranslations } from '@dxos/plugin-markdown/translations';
import * as CommentOperation from '@dxos/plugin-review/CommentOperation';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import { translations as reviewTranslations } from '@dxos/plugin-review/translations';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as Panel from '@dxos/react-ui/Panel';
import { UpdateCompanionStubPlugin } from '@dxos/storybook-testing';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { StoryRole, StorySettingsToolbar } from '../modules/index.ts';
import {
  ModuleContainer,
  type ModuleLayout,
  createDecorators,
  storyConfig,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = {
  layout?: ModuleLayout;
  /** Keeps the profile (space, threads, hidden chats) across reloads; a change reboots the story. */
  persistent?: boolean;
};

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-agent/CommentAgent',
  render: (args) => (
    <Panel.Root>
      <Panel.Header>
        <StorySettingsToolbar />
      </Panel.Header>
      {/* `ModuleContainer` pins itself to its nearest positioned ancestor, so the body is that ancestor. */}
      <Panel.Body classNames='relative'>
        <ModuleContainer {...args} />
      </Panel.Body>
    </Panel.Root>
  ),
  parameters: {
    ...storyParameters,
    translations: [
      ...storyParameters.translations,
      ...illustratorTranslations,
      ...markdownTranslations,
      ...reviewTranslations,
    ],
  },
  argTypes: { persistent: { control: 'boolean' } },
  tags: ['!test'],
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** The objects a comment can be left on, the review plugin that owns the threads, and the space it persists them in. */
const commentPlugins = () => [
  SpacePlugin.make({}),
  MarkdownPlugin.make(),
  IllustratorPlugin.make(),
  CanvasPlugin.make(),
  ReviewPlugin.make(),
  UpdateCompanionStubPlugin(),
];

const commentTypes = [
  Drawing.Drawing,
  Drawing.Canvas,
  Markdown.Document,
  Thread.Thread,
  Message.Message,
  AnchoredTo.AnchoredTo,
];

/** Leaves an opening comment on `subject`, so the companion shows a thread to reply to. */
const seedComment = async (
  db: Database.Database,
  invoker: Capabilities.OperationInvoker,
  subject: Obj.Unknown,
  text: string,
) => {
  await db.flush({ indexes: true });
  await invoker.invokePromise(
    CommentOperation.Create,
    { subject, anchor: Date.now().toString(), text, sender: { name: 'Alice' } },
    { spaceId: db.spaceId },
  );
};

/** The object of `type` beside its comments companion. */
const commentsLayout = (type: Type.AnyEntity): ModuleLayout => [
  [{ type: StoryRole.Comments, data: { type }, id: 'comments' }],
];

/**
 * A comment on a diagram, answered by the assistant with the illustrator's skills, on the EDGE the toolbar picks.
 * Setup: the package README (local EDGE, or pick dev in the toolbar).
 *
 * Try:
 * 1. Reply to Alice's comment with `@Kai what is this diagram about?`: Kai answers in the thread.
 * 2. Reply `@Kai add a box labelled "Edge" connected to "Client"`: Kai edits the diagram and says what it changed.
 * 3. Reply without `@Kai`: nothing answers (the default comment agent mode is `mention`).
 * 4. Reload: the thread and its replies are still there.
 */
export const Diagram: Story = {
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    config: storyConfig({ persistent: args.persistent }),
    plugins: commentPlugins(),
    types: commentTypes,
    onReady: async ({ db, invoker }) => {
      const canvas = db.add(Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA }));
      const drawing = db.add(Drawing.make({ name: 'Architecture', canvas }));
      await seedComment(db, invoker, drawing, 'Can we show where EDGE fits in?');
    },
  })),
  args: { persistent: false, layout: commentsLayout(Drawing.Drawing) },
};

/**
 * A comment on a document, answered by the assistant with the markdown skills.
 *
 * Try:
 * 1. Reply `@Kai summarise this document in one sentence`: Kai answers in the thread.
 * 2. Reply `@Kai add a closing paragraph`: Kai edits the document and says what it changed.
 */
export const Document: Story = {
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    config: storyConfig({ persistent: args.persistent }),
    plugins: commentPlugins(),
    types: commentTypes,
    onReady: async ({ db, invoker }) => {
      const doc = db.add(
        Markdown.make({
          name: 'Release notes',
          content: '# Release notes\n\nComment threads now run on feeds, and the assistant answers them.\n',
        }),
      );
      await seedComment(db, invoker, doc, 'Is this clear enough for users?');
    },
  })),
  args: { persistent: false, layout: commentsLayout(Markdown.Document) },
};
