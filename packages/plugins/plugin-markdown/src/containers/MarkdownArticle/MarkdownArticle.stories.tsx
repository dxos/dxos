//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { translations as spaceTranslations } from '@dxos/plugin-space/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import * as Tldraw from '@dxos/plugin-tldraw/Tldraw';
import * as TldrawModel from '@dxos/plugin-tldraw/TldrawModel';
import * as TldrawPlugin from '@dxos/plugin-tldraw/TldrawPlugin';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { MarkdownPlugin } from '#plugin';
import { translations } from '#translations';
import { Markdown, MarkdownCapabilities } from '#types';

random.seed(1);

const generator: ValueGenerator = random as any;

// A minimal sketch (tldraw `tldraw.com/2`) snapshot, used as a test sketch.
const SKETCH_CONTENT = new TldrawModel.RecordBuilder()
  .rectangle({ id: 'rect', x: 0, y: 0, text: 'DXOS', color: 'blue', fill: 'solid', size: 'l' })
  .build();

/** Minimal plugin that contributes an empty Extensions capability for stories. */
const MarkdownExtensionsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.markdownExtensions'),
    name: 'Story Extensions',
  }),
).pipe(
  Plugin.addModule({
    id: 'extensions',
    provides: [MarkdownCapabilities.ExtensionProvider],
    activate: () => Effect.succeed([Capability.contribute(MarkdownCapabilities.ExtensionProvider, [])]),
  }),
  Plugin.make,
);

/** The document embedded inside the story's own document; the story renders the other one. */
const EMBEDDED_NOTES = 'Embedded notes';

type StoryArgs = {
  title: string;
  content: string;
  objects?: boolean;
  /** Delete the sketch after the document embeds it, so its embed points at nothing. */
  deleted?: boolean;
};

const DefaultStory = () => {
  const { invokePromise } = useOperationInvoker();
  const [space] = useSpaces();
  const docs = useQuery(space?.db, Query.type(Markdown.Document));
  const doc = docs.find((candidate) => candidate.name !== EMBEDDED_NOTES);
  const id = doc && Obj.getURI(doc);
  const data = useMemo(() => ({ subject: doc, attendableId: id ?? 'story' }), [doc, id]);
  const attentionAttrs = useAttentionAttributes(id);

  useAsyncEffect(async () => {
    if (space) {
      await invokePromise(LayoutOperation.SwitchWorkspace, { subject: space.id });
    }
  }, [space, invokePromise]);

  return (
    <div className='contents' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-markdown/containers/MarkdownArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<StoryArgs>(
      ({ args: { title = 'Testing', content = '', objects: showObjects = false, deleted = false } }) => ({
        plugins: [
          ...corePlugins(),
          StorybookPlugin.make({}),
          MarkdownExtensionsPlugin(),
          IllustratorPlugin.make(),
          TldrawPlugin.make(),
          ClientPlugin.make({
            types: [
              Markdown.Document,
              Text.Text,
              Person.Person,
              Organization.Organization,
              Drawing.Drawing,
              Drawing.Canvas,
            ],
            onClientInitialized: ({ client }) =>
              Effect.gen(function* () {
                const { defaultSpace } = yield* initializeIdentity(client);

                let objects: Obj.Any[] = [];
                if (showObjects) {
                  const createObjects = createObjectFactory(defaultSpace.db, generator);
                  objects = yield* Effect.promise(() =>
                    createObjects([
                      {
                        type: Organization.Organization,
                        count: 1,
                      },
                      {
                        type: Person.Person,
                        count: 1,
                      },
                    ]),
                  );

                  objects.push(
                    Drawing.make({
                      name: 'Test Sketch',
                      canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content: SKETCH_CONTENT }),
                    }),
                    // A document embeds as a section preview, whose content outgrows the resize box.
                    Markdown.make({
                      name: EMBEDDED_NOTES,
                      content: Array.from({ length: 40 }, (_, line) => `Line ${line + 1} of the embedded notes.`).join(
                        '\n\n',
                      ),
                    }),
                  );

                  objects.forEach((object) => defaultSpace.db.add(object));
                  yield* Effect.promise(() => defaultSpace.db.flush());
                }

                defaultSpace.db.add(
                  Markdown.make({
                    name: title,
                    content: [
                      `# ${title}`,
                      content,
                      objects
                        .map((object, i) => [
                          'This is object #' + (i + 1),
                          `![${Obj.getLabel(object)}|300](${Obj.getURI(object)})`,
                        ])
                        .flat()
                        .join('\n\n'),
                      'This is the end of the document.',
                    ].join('\n\n'),
                  }),
                );

                yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));

                // Removed only once the document references it, the way a user deletes an embedded object.
                if (deleted) {
                  const sketch = objects.find((object) => Obj.instanceOf(Drawing.Drawing, object));
                  if (sketch) {
                    defaultSpace.db.remove(sketch);
                    yield* Effect.promise(() => defaultSpace.db.flush());
                  }
                }
              }),
          }),

          // Contributes the versioning-state atom consumed by useVersioning.
          SpacePlugin({}),
          MarkdownPlugin(),
          PreviewPlugin.make(),
        ],
      }),
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...spaceTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    title: 'Testing',
    content: 'Hello, world!',
  },
};

/**
 * Test:
 * 1. Scroll the document with the wheel over the sketch and over the embedded notes: the document
 *    scrolls; neither embed pans or scrolls.
 * 2. Click the sketch: its border takes the focus colour and the tldraw UI appears; the wheel now
 *    pans the sketch.
 * 3. Press Escape: the border reverts and the wheel scrolls the document again.
 * 4. Click the embedded notes and wheel past their end: the document does not scroll.
 * 5. With the notes attended, press Mod-B: the outer document's toolbar/formatting does not react.
 * 6. Click back into the document text: the notes lose the focus border.
 */
export const WithObjects: Story = {
  args: {
    title: 'Testing with objects',
    content: 'Here are some inline objects:',
    objects: true,
  },
};

/**
 * Test:
 * 1. The sketch embed shows an error chip on a single line: no reserved height, no bare box.
 * 2. Click into the error line: the raw `![Car|390](echo://…)` source is editable.
 */
export const DeletedEmbed: Story = {
  args: {
    title: 'Testing with a deleted object',
    content: 'The sketch below was deleted after being embedded:',
    objects: true,
    deleted: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The embed settles on "missing" only after the ref's load attempt, well past the default timeout.
    const chip = await canvas.findByText('Object not found', {}, { timeout: 15_000 });
    // Inline after the source, not a block standing in for it: the link text is back and editable.
    const line = chip.closest('.cm-line');
    await expect(line).not.toBeNull();
    await expect(line?.textContent).toMatch(/!\[Test Sketch\|300\]\(echo:/);
    // No placeholder pinned at the label's height around it.
    await expect(chip.closest('[style*="height"]')).toBeNull();
    // The other embeds are untouched.
    await expect(canvas.getAllByTestId('markdown.embed').length).toBeGreaterThanOrEqual(1);
  },
};

/**
 * An embed is inert until clicked, keeps key events to itself while attended, and is inert again
 * once Escape hands focus back to the editor.
 */
export const EmbedFocus: Story = {
  args: WithObjects.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The client/space initialize and the embeds resolve well past testing-library's default timeout.
    await waitFor(async () => expect(canvas.getAllByTestId('markdown.embed').length).toBeGreaterThanOrEqual(2), {
      timeout: 15_000,
    });
    // Let the load-time rebuilds (parse completion, the cards' height release) land first: a block
    // redrawn under the click would be a fresh element, and the click's focus would go with the old one.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    // The first embed is a card preview; the gate is the same for section previews.
    const [embed] = canvas.getAllByTestId('markdown.embed');
    const surface = embed.firstElementChild;
    await expect(surface).toBeInstanceOf(HTMLElement);
    await expect(surface).toHaveAttribute('inert');

    await userEvent.click(embed);
    await waitFor(() => expect(surface).not.toHaveAttribute('inert'));
    await expect(embed).toHaveAttribute('data-w-attention-source', 'true');

    // A key pressed inside the attended embed does not reach the document (an app shortcut).
    const leaked: string[] = [];
    const onKeyDown = (event: KeyboardEvent) => leaked.push(event.key);
    document.addEventListener('keydown', onKeyDown);
    try {
      await userEvent.keyboard('b');
      await expect(leaked).toEqual([]);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(surface).toHaveAttribute('inert'));
    } finally {
      document.removeEventListener('keydown', onKeyDown);
    }
  },
};
