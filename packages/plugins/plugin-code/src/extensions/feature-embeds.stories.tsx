//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState, StateEffect } from '@codemirror/state';
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
import { FeatureEditingPlugin, FeatureSeed, queryElement } from '@dxos/plugin-code/testing';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
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
const embeds = (canvasElement: HTMLElement) => within(canvasElement).queryAllByTestId('markdown.embed');

/** The feature an embed draws: the last part of its attendable id. */
const featureOf = (element: Element | null | undefined) =>
  element?.getAttribute('data-attendable-id')?.split('/').at(-1);

/** The features the text embeds, in order. */
const embedded = (view: EditorView) => FeatureEmbed.parse(view.state.doc.toString()).map(({ id }) => id);

const meta = {
  title: 'plugins/plugin-code/extensions/feature-embeds',
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
                  Spec.make({ name: PROSE_NAME, content: PROSE, dialects: [FeatureMap.SOFTWARE_DIALECT] }),
                );
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        // Draws the feature embeds.
        MarkdownPlugin.make(),
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
      .find((ref) => ref.peek()?.id === featureOf(first))
      ?.peek();
    invariant(feature, 'Missing feature.');

    await userEvent.click(first);
    const name = await within(first).findByTestId('name');
    await waitFor(() => expect(name.closest('[inert]')).toBeNull(), { timeout: 5_000 });
    const original = feature.name;
    const content = queryElement(name, '.cm-content');
    await userEvent.click(content);
    await userEvent.type(content, '{End} 2');
    await waitFor(() => expect(feature.name).toBe(`${original} 2`), { timeout: 5_000 });
  },
};

/** The seeded spec with no play of its own; QA-6 walks it with the keyboard. */
export const Sample: Story = {};

/** A section without attention is inert, its fold toggle too: a click selects it, and then the toggle folds it. */
export const FoldSelected: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const embed = await waitFor(() => embeds(canvasElement)[1], { timeout: 10_000 });
    const toggle = within(embed).getByTestId('feature-section.collapse');
    await expect(toggle.closest('[inert]')).not.toBeNull();

    await userEvent.click(embed);
    await waitFor(() => expect(document.activeElement).toBe(embed));
    await waitFor(() => expect(toggle.closest('[inert]')).toBeNull(), { timeout: 5_000 });
    await expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('false'), { timeout: 5_000 });
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('true'), { timeout: 5_000 });
  },
};

/**
 * Arrowing through the text stops on each section: selected, it rings; Enter edits its name,
 * Escape selects it again, and the arrows move on to the text on either side.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const { doc } = view.state;
    const [first] = FeatureEmbed.parse(doc.toString());
    const before = doc.line(doc.lineAt(first.from).number - 1);
    const embed = await waitFor(
      () => {
        const element = embeds(canvasElement).find((element) => featureOf(element) === first.id);
        invariant(element, 'Missing embed.');
        return element;
      },
      { timeout: 5_000 },
    );
    const atBefore = async () => {
      await expect(document.activeElement).toBe(view.contentDOM);
      await expect(view.state.selection.main.head).toBe(before.to);
    };

    view.dispatch({ selection: EditorSelection.cursor(before.to) });
    view.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(embed));
    await expect(embed.matches(':focus-visible')).toBe(true);

    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(document.activeElement?.closest('[data-testid="name"]')).not.toBeNull());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(embed));

    await userEvent.keyboard('{ArrowUp}');
    await waitFor(atBefore);
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(embed));
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(atBefore);
  },
};

/** The section drawn for an embed, once the editor has drawn it. */
const findEmbed = (canvasElement: HTMLElement, id: string) =>
  waitFor(
    () => {
      const element = embeds(canvasElement).find((element) => featureOf(element) === id);
      invariant(element, 'Missing embed.');
      return element;
    },
    { timeout: 5_000 },
  );

/** Selects a section as the arrows would: focused itself. */
const select = async (element: HTMLElement) => {
  element.focus();
  await waitFor(() => expect(document.activeElement).toBe(element));
};

/** Whether the cursor is in the text rather than in an embed's hidden source. */
const inText = (view: EditorView) => {
  const { head } = view.state.selection.main;
  return (
    document.activeElement === view.contentDOM &&
    FeatureEmbed.parse(view.state.doc.toString()).every(({ from, to }) => head < from || head > to)
  );
};

/** Waits for the browser to draw `count` frames. */
const frames = (count: number) =>
  new Promise<void>((resolve) => {
    const next = (left: number) => (left === 0 ? resolve() : requestAnimationFrame(() => next(left - 1)));
    next(count);
  });

/** Removes the blank line between the first two sections, so they sit on adjacent lines. */
const joinFirstTwo = (view: EditorView) => {
  const [first, second] = FeatureEmbed.parse(view.state.doc.toString());
  view.dispatch({ changes: { from: first.to, to: second.from, insert: '\n' } });
  return FeatureEmbed.parse(view.state.doc.toString());
};

/**
 * Leaving a selected section puts the cursor in text, past a section beside it or before one at the end; the embed of
 * a missing feature is its source, which the arrows reach as text.
 */
export const LeaveSelection: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const [first, second] = joinFirstTwo(view);

    await select(await findEmbed(canvasElement, first.id));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(inText(view)).toBe(true));
    await expect(view.state.selection.main.head).toBe(second.to + 1);

    const missing = `${first.id.slice(0, -1)}${first.id.endsWith('A') ? 'B' : 'A'}`;
    const source = view.state.sliceDoc(first.from, first.to).replace(first.id, missing);
    view.dispatch({ changes: { from: second.from, insert: `${source}\n` } });
    // The embed is a block until the lookup settles, and then its source.
    await waitFor(
      () =>
        expect(
          [...view.contentDOM.querySelectorAll('.cm-line')].some((line) => line.textContent?.includes(missing)),
        ).toBe(true),
      { timeout: 5_000 },
    );
    await select(await findEmbed(canvasElement, first.id));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(view.contentDOM));
    await expect(view.state.doc.lineAt(view.state.selection.main.head).text).toContain(missing);
    // The source can wrap, and Down from an upper row stays in it: arrow on from its end.
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.lineAt(view.state.selection.main.head).to) });
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(featureOf(document.activeElement)).toBe(second.id));
    // Alt changes only Up and Down: with Left the selection goes back to the text, as without it.
    await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');
    await waitFor(() => expect(document.activeElement).toBe(view.contentDOM));

    const last = FeatureEmbed.parse(view.state.doc.toString()).at(-1);
    invariant(last, 'Missing embed.');
    view.dispatch({
      changes: { from: last.to, to: view.state.doc.length },
      effects: EditorView.scrollIntoView(last.from),
    });
    const embed = await findEmbed(canvasElement, last.id);
    await select(embed);
    const before = { doc: view.state.doc.toString(), head: view.state.selection.main.head };
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await frames(10);
    await expect({ doc: view.state.doc.toString(), head: view.state.selection.main.head }).toEqual(before);
    await expect(document.activeElement).toBe(embed);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(inText(view)).toBe(true));
  },
};

/**
 * Backspace on a selected section removes it with the line break before it, and leaves the cursor in text; a section
 * with text before it on its line is left at its edge, and removes only itself.
 */
export const DeleteSelection: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const [, second, third] = joinFirstTwo(view);

    await select(await findEmbed(canvasElement, second.id));
    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(embedded(view)).not.toContain(second.id), { timeout: 5_000 });
    await waitFor(() => expect(inText(view)).toBe(true));

    const at = FeatureEmbed.parse(view.state.doc.toString()).find(({ id }) => id === third.id);
    invariant(at, 'Missing embed.');
    view.dispatch({ changes: { from: at.from, insert: 'Note: ' } });
    const beside = await findEmbed(canvasElement, third.id);
    await select(beside);
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(document.activeElement).toBe(view.contentDOM));
    await expect(view.state.selection.main.head).toBe(at.from + 'Note: '.length);
    await select(beside);
    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(embedded(view)).not.toContain(third.id), { timeout: 5_000 });
    await expect(view.state.doc.lineAt(at.from).text).toBe('Note: ');
  },
};

/**
 * Undo on a selected section undoes its move, and the section stays selected; with nothing to redo it stays selected
 * too. Undoing a delete in the text brings the section back with the cursor still in text.
 */
export const UndoMove: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const [first] = FeatureEmbed.parse(view.state.doc.toString());
    const original = view.state.doc.toString();
    const selected = () => featureOf(document.activeElement);

    await select(await findEmbed(canvasElement, first.id));
    await userEvent.keyboard('{Control>}y{/Control}');
    await frames(10);
    await expect(selected()).toBe(first.id);

    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(view.state.doc.toString()).not.toBe(original));
    await userEvent.keyboard('{Control>}z{/Control}');
    await waitFor(() => expect(view.state.doc.toString()).toBe(original));
    await waitFor(() => expect(selected()).toBe(first.id));

    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(view.state.doc.toString()).not.toBe(original));
    await waitFor(() => expect(selected()).toBe(first.id));
    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(embedded(view)).not.toContain(first.id), { timeout: 5_000 });
    // The editor's own undo is on Mod, which is Cmd on macOS.
    const mod = /Mac/.test(navigator.platform) ? 'Meta' : 'Control';
    await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
    await waitFor(() => expect(embedded(view)).toContain(first.id), { timeout: 5_000 });
    await waitFor(() => expect(inText(view)).toBe(true));
  },
};

/** A selected section in a read-only document neither moves nor deletes, and stays selected. */
export const ReadOnlySelection: Story = {
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(embedded(view)).toHaveLength(8), { timeout: 10_000 });
    const [first] = FeatureEmbed.parse(view.state.doc.toString());
    view.dispatch({ effects: StateEffect.appendConfig.of(EditorState.readOnly.of(true)) });
    await expect(view.state.readOnly).toBe(true);
    const original = view.state.doc.toString();

    const embed = await findEmbed(canvasElement, first.id);
    await select(embed);
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await userEvent.keyboard('{Backspace}');
    await frames(10);
    await expect(view.state.doc.toString()).toBe(original);
    await expect(document.activeElement).toBe(embed);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(inText(view)).toBe(true));
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
        const element = embeds(canvasElement).find((element) => featureOf(element) === id);
        invariant(element, 'Missing embed.');
        return element;
      },
      { timeout: 5_000 },
    );
    await expect(within(embed).getByTestId('name')).toHaveTextContent('Undo send');
    await waitFor(() => expect(document.activeElement?.closest('[data-testid="markdown.embed"]')).toBe(embed), {
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
      await waitFor(() => expect(document.activeElement?.closest('[data-testid="name"]')).not.toBeNull(), {
        timeout: 5_000,
      });
      await userEvent.keyboard(name);
      await userEvent.keyboard('{Escape}');
    };
    await makeFeature('Mail should feel instant.', 'Instant inbox');
    await makeFeature('Search finds any message', 'Search');
    await waitFor(() => expect(names()).toEqual(['Instant inbox', 'Search']), { timeout: 5_000 });
    await expect(held()[1].peek()?.description).toBe('Search finds any message by a word in it, attachments included.');

    // Escape from the name selected the Search section; moving it up past the blank line and the other embed moves the
    // feature up.
    await userEvent.keyboard('{Alt>}{ArrowUp}{ArrowUp}{/Alt}');
    await waitFor(() => expect(names()).toEqual(['Search', 'Instant inbox']), { timeout: 5_000 });
    await expect(view.state.doc.toString()).toContain('Later, maybe: snooze, and sending at a set time.');
  },
};
