//
// Copyright 2026 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Spec from '@dxos/compute/Spec';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed } from '@dxos/plugin-code/testing';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import { translations as projectsTranslations } from '@dxos/plugin-projects/translations';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { trim } from '@dxos/util';

import { translations } from '#translations';
import { FeatureEmbed, FeatureMap } from '#types';

type StoryArgs = {
  attendableId: string;
  /** Shows the spec whose text is prose alone, in place of the seeded one that holds eight features. */
  prose?: boolean;
};

const PROSE_NAME = 'Mail';

/** A spec written as a wall of text, before any of it is a feature. */
const PROSE = trim`
  ---
  name: ${PROSE_NAME}
  ---

  Mail should feel instant. New mail shows within a minute of arriving, and the inbox never blocks while it syncs.

  Search finds any message by a word in it, attachments included.

  Later, maybe: snooze, and sending at a set time.
`;

/** The spec the story shows, for plays that check the model behind the text. */
let shown: Spec.Spec | undefined;

const DefaultStory = ({ attendableId, prose }: StoryArgs) => {
  const [space] = useSpaces();
  const spec = useQuery(space?.db, Filter.type(Spec.Spec)).find(
    (spec) => !FeatureMap.getOwner(spec) && (spec.name === PROSE_NAME) === !!prose,
  );
  shown = spec;
  if (!spec) {
    return <Loading data={{ spec: !!spec }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <Surface.Surface type={AppSurface.Section} data={{ subject: spec, attendableId }} limit={1} />
    </AttendableContainer>
  );
};

const findView = async (canvasElement: HTMLElement) =>
  waitFor(
    () => {
      // The editor's root, not its content: lookup takes the first content within, and each section holds an editor.
      const root = canvasElement.querySelector<HTMLElement>('.cm-editor');
      const view = root && EditorView.findFromDOM(root);
      invariant(view, 'Missing editor.');
      return view;
    },
    // Long enough for the first story's cold boot of the plugin stack in a full parallel run.
    { timeout: 30_000 },
  );

/** The embeds drawn; only those in the viewport are. */
const embeds = (canvasElement: HTMLElement) => within(canvasElement).queryAllByTestId('feature-embed');

/** The features the text embeds, in order. */
const embedded = (view: EditorView) => FeatureEmbed.parse(view.state.doc.toString()).map(({ id }) => id);

const meta = {
  title: 'plugins/plugin-code/containers/FeatureEmbeds',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: FeatureSeed.types,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                FeatureSeed.seed(defaultSpace.db);
                defaultSpace.db.add(
                  Spec.make({ name: PROSE_NAME, content: PROSE, dialects: FeatureMap.SOFTWARE_DIALECTS }),
                );
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        // Renders a spec's section, its document editor, with the editing the feature package gives it.
        ProjectsPlugin.make(),
        // plugin-projects' declared dependencies.
        AssistantPlugin.make(),
        TasksPlugin.make(),
        FeatureEditingPlugin.make(),
      ],
    }),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...projectsTranslations, ...reactUiTranslations, ...formTranslations],
  },
  args: { attendableId: 'test' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Waits for the editor to settle on `/feature`'s completion, then accepts it. */
const acceptFeature = async () => {
  await waitFor(() => expect(document.querySelector('.cm-tooltip-autocomplete')).not.toBeNull(), { timeout: 5_000 });
  // Completion ignores an Enter that lands within its interaction delay of opening.
  await new Promise((resolve) => setTimeout(resolve, 150));
  await userEvent.keyboard('{Enter}');
};

/** Puts the cursor at the end of the line that holds `text`. */
const placeCursor = async (view: EditorView, text: string) => {
  await userEvent.click(view.contentDOM.querySelector<HTMLElement>('.cm-line') ?? view.contentDOM);
  const index = view.state.doc.toString().indexOf(text);
  invariant(index !== -1, `Missing line: ${text}`);
  const line = view.state.doc.lineAt(index);
  view.dispatch({ selection: EditorSelection.cursor(line.to) });
};

/** The refs to the features the shown spec holds. */
const held = () => (shown ? FeatureMap.getFeatures(shown) : []);

const names = () => held().map((ref) => ref.peek()?.name);

/** Each feature the spec holds is embedded in its text as a section; once attended, its form edits the feature. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const first = await waitFor(() => embeds(canvasElement)[0], { timeout: 10_000 });
    const feature = held()
      .find((ref) => ref.peek()?.id === first.dataset.feature)
      ?.peek();
    invariant(feature, 'Missing feature.');

    await userEvent.click(first);
    const name = within(first).getByTestId<HTMLInputElement>('name');
    await waitFor(() => expect(name.closest('[inert]')).toBeNull(), { timeout: 5_000 });
    await userEvent.clear(name);
    await userEvent.type(name, 'Renamed');
    await waitFor(() => expect(feature.name).toBe('Renamed'), { timeout: 5_000 });
  },
};

/** A section without attention is inert but for its fold toggle, which folds and unfolds it in one click. */
export const FoldUnattended: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const embed = await waitFor(() => embeds(canvasElement)[1], { timeout: 10_000 });
    const toggle = within(embed).getByTestId('feature-section.collapse');
    await expect(within(embed).getByTestId('name').closest('[inert]')).not.toBeNull();
    await expect(toggle.closest('[inert]')).toBeNull();

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('false'), { timeout: 5_000 });
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('true'), { timeout: 5_000 });
  },
};

/** `/feature` after a phrase makes a feature named by it, embedded where the line was, with its description to write. */
export const SlashFeature: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    await userEvent.click(view.contentDOM.querySelector<HTMLElement>('.cm-line') ?? view.contentDOM);
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    await userEvent.keyboard('{Enter}Undo send /feat');
    await acceptFeature();

    await waitFor(() => expect(embedded(view)).toHaveLength(9), { timeout: 5_000 });
    const id = embedded(view)[8];
    const embed = await waitFor(
      () => {
        const element = embeds(canvasElement).find((element) => element.dataset.feature === id);
        invariant(element, 'Missing embed.');
        return element;
      },
      { timeout: 5_000 },
    );
    await expect(within(embed).getByTestId<HTMLInputElement>('name').value).toBe('Undo send');
    await waitFor(() => expect(document.activeElement?.closest('[data-testid="feature-embed"]')).toBe(embed), {
      timeout: 5_000,
    });
    await expect(document.activeElement?.getAttribute('contenteditable')).toBe('true');
    await waitFor(() => expect(held()).toHaveLength(9), { timeout: 5_000 });
    await expect(view.state.doc.toString()).not.toContain('/feat');
  },
};

/** Backspace with the cursor after an embed deletes it, and its feature with it; nothing else moves. */
export const RemoveEmbed: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const [id] = embedded(view);
    const feature = held()
      .find((ref) => ref.peek()?.id === id)
      ?.peek();
    invariant(feature, 'Missing feature.');

    await placeCursor(view, `${id})`);
    await userEvent.keyboard('{Backspace}');

    await waitFor(() => expect(embedded(view)).toHaveLength(7), { timeout: 5_000 });
    await expect(embedded(view)).not.toContain(id);
    await waitFor(() => expect(Obj.isDeleted(feature)).toBe(true), { timeout: 5_000 });
    await expect(held()).toHaveLength(7);
  },
};

/** A spec written as prose alone, before any of it is a feature; QA-7 walks it with no play of its own. */
export const Prose: Story = {
  args: { prose: true },
};

/**
 * A spec can start as prose and take structure a piece at a time: `/feature` at the end of a paragraph makes it the
 * description of a new feature whose name takes the cursor, and an embed moves like any line, the spec's order with it.
 */
export const FromProse: Story = {
  ...Prose,
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(view.state.doc.toString()).toContain('Mail should feel instant.'), { timeout: 10_000 });
    await expect(embedded(view)).toHaveLength(0);

    const makeFeature = async (paragraph: string, name: string) => {
      await placeCursor(view, paragraph);
      await userEvent.keyboard(' /feat');
      await acceptFeature();
      await waitFor(() => expect(document.activeElement?.getAttribute('data-testid')).toBe('name'), {
        timeout: 5_000,
      });
      await userEvent.keyboard(name);
      await userEvent.keyboard('{Escape}');
    };
    await makeFeature('Mail should feel instant.', 'Instant inbox');
    await makeFeature('Search finds any message', 'Search');
    await waitFor(() => expect(names()).toEqual(['Instant inbox', 'Search']), { timeout: 5_000 });
    await expect(held()[1].peek()?.description).toBe('Search finds any message by a word in it, attachments included.');

    // Escape left the cursor on the Search embed's line; moving it up past the blank line and the other embed moves
    // the feature up.
    await userEvent.keyboard('{Alt>}{ArrowUp}{ArrowUp}{/Alt}');
    await waitFor(() => expect(names()).toEqual(['Search', 'Instant inbox']), { timeout: 5_000 });
    await expect(view.state.doc.toString()).toContain('Later, maybe: snooze, and sending at a set time.');
  },
};
