//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import { type Database, Filter, type Obj, type Type } from '@dxos/echo';
import * as CanvasType from '@dxos/plugin-canvas/Canvas';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
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
import { ModuleContainer, createDecorators, storyConfig, storyParameters } from '../testing/index.ts';

type StoryArgs = {
  /** Keeps the profile (space, threads, hidden chats) across reloads; a change reboots the story. */
  persistent?: boolean;
};

const meta: Meta<StoryArgs> = {
  title: 'stories/stories-agent/CommentAgent',
  // The layout is the runtime one `onInit` returns.
  render: () => (
    <Panel.Root>
      <Panel.Header>
        <StorySettingsToolbar />
      </Panel.Header>
      {/* `ModuleContainer` pins itself to its nearest positioned ancestor, so the body is that ancestor. */}
      <Panel.Body classNames='relative'>
        <ModuleContainer />
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
  args: { persistent: false },
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
  MarkdownType.Document,
  Thread.Thread,
  Message.Message,
  AnchoredTo.AnchoredTo,
];

/**
 * The object's article and its comments companion, each in its own module. Filing the object in the root collection
 * gives it the app-graph node the article toolbar's comment action attaches to.
 */
const commentLayout = (space: Space, object: Obj.Unknown): ModuleLayout => {
  addToRootCollection(space, [object]);
  return [[Cell.article(object)], [Cell.companion(object, 'comments')]];
};

/** Leaves an opening comment on the space's object of `type`, so the companion shows a thread to reply to. */
const seedComment = async (
  db: Database.Database,
  invoker: Capabilities.OperationInvoker,
  type: Type.AnyObj,
  text: string,
) => {
  await db.flush({ indexes: true });
  const [subject] = await db.query(Filter.type(type)).run();
  await invoker.invokePromise(
    CommentOperation.Create,
    { subject, anchor: Date.now().toString(), text, sender: { name: 'Alice' } },
    { spaceId: db.spaceId },
  );
};

/**
 * A comment on a Markdown document, answered by the assistant with the markdown skills, on the EDGE the toolbar picks.
 * Setup: the package README (local EDGE, or pick dev in the toolbar).
 *
 * Try:
 * 1. Reply `@Kai summarise this document in one sentence`: Kai answers in the thread.
 * 2. Reply `@Kai add a closing paragraph`: Kai edits the document and says what it changed.
 * 3. Select text and click the toolbar's comment button: a new thread anchored to the selection opens.
 * 4. Reply without `@Kai`: nothing answers (the default comment agent mode is `mention`).
 */
export const Markdown: Story = {
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    config: storyConfig({ persistent: args.persistent }),
    plugins: commentPlugins(),
    types: commentTypes,
    onInit: async ({ space }) =>
      commentLayout(
        space,
        space.db.add(
          MarkdownType.make({
            name: 'Release notes',
            content: '# Release notes\n\nComment threads now run on feeds, and the assistant answers them.\n',
          }),
        ),
      ),
    onReady: ({ db, invoker }) => seedComment(db, invoker, MarkdownType.Document, 'Is this clear enough for users?'),
  })),
};

/**
 * A comment on a canvas drawing, answered by the assistant with the illustrator's skills.
 *
 * Try:
 * 1. Reply `@Kai add a box labelled Edge connected to a box labelled Client`: Kai draws them and says so.
 * 2. Reply `@Kai what is this diagram about?`: Kai answers in the thread.
 */
export const Canvas: Story = {
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    config: storyConfig({ persistent: args.persistent }),
    plugins: commentPlugins(),
    types: commentTypes,
    onInit: async ({ space }) => {
      const canvas = space.db.add(Drawing.makeCanvas({ schema: CanvasType.SCENE_SCHEMA }));
      return commentLayout(space, space.db.add(Drawing.make({ name: 'Architecture', canvas })));
    },
    onReady: ({ db, invoker }) => seedComment(db, invoker, Drawing.Drawing, 'Can we show where EDGE fits in?'),
  })),
};
