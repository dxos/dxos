//
// Copyright 2026 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed } from '@dxos/plugin-projects/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import * as Layout from '@dxos/react-ui/Layout';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { SpecDocument } from '@dxos/types';
import { trim } from '@dxos/util';

import { translations } from '#translations';
import { Spec } from '#types';

import { FeatureCompanion } from '../FeatureCompanion/index.ts';
import { SpecDocumentArticle } from './SpecDocumentArticle.tsx';

type StoryArgs = {
  attendableId: string;
  /** Shows the spec whose document is prose alone, in place of the seeded one that holds eight features. */
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
    (spec) => !Spec.getOwner(spec) && (spec.name === PROSE_NAME) === !!prose,
  );
  const document = useResolveRef(spec?.document);
  shown = spec;
  if (!spec || !document) {
    return <Loading data={{ spec: !!spec, document: !!document }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <Layout.Grid classNames='dx-fill grid-cols-[1fr_24rem] divide-x divide-separator'>
        <SpecDocumentArticle role='article' subject={document} attendableId={attendableId} />
        <FeatureCompanion spec={spec} attendableId={attendableId} />
      </Layout.Grid>
    </AttendableContainer>
  );
};

const findView = async (canvasElement: HTMLElement) =>
  waitFor(
    () => {
      const content = canvasElement.querySelector<HTMLElement>('.cm-content');
      const view = content && EditorView.findFromDOM(content);
      invariant(view, 'Missing editor.');
      return view;
    },
    { timeout: 10_000 },
  );

const embeds = (canvasElement: HTMLElement) => within(canvasElement).queryAllByTestId('feature-embed');

const meta = {
  title: 'plugins/plugin-projects/containers/SpecDocumentArticle',
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
                  Spec.make({
                    name: PROSE_NAME,
                    document: Ref.make(SpecDocument.make({ name: PROSE_NAME, content: PROSE })),
                  }),
                );
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        FeatureEditingPlugin.make(),
      ],
    }),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations, ...formTranslations],
  },
  args: { attendableId: 'test' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Each feature the spec holds is embedded in its document and drawn as its card; a click shows it in the companion. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(embeds(canvasElement)).toHaveLength(8), { timeout: 10_000 });
    const [first] = embeds(canvasElement);
    await userEvent.click(within(first).getByTestId('feature-card'));
    await waitFor(() => expect(first).toHaveAttribute('data-selected', 'true'), { timeout: 5_000 });
    await expect(within(canvasElement).findByTestId('feature-companion')).resolves.toBeTruthy();
  },
};

/** `/feature` at the end of a line of prose turns the line into a new feature named by it, embedded where it was. */
export const SlashFeature: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(embeds(canvasElement)).toHaveLength(8), { timeout: 10_000 });
    const view = await findView(canvasElement);
    // Typing goes to the focused element, which a click on the text gives the editor.
    await userEvent.click(view.contentDOM.querySelector<HTMLElement>('.cm-line') ?? view.contentDOM);
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    await userEvent.keyboard('{Enter}Undo send /feat');
    await waitFor(() => expect(document.querySelector('.cm-tooltip-autocomplete')).not.toBeNull(), {
      timeout: 5_000,
    });
    // Completion ignores an Enter that lands within its interaction delay of opening.
    await new Promise((resolve) => setTimeout(resolve, 150));
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(embeds(canvasElement)).toHaveLength(9), { timeout: 5_000 });
    await expect(within(embeds(canvasElement)[8]).getByText('Undo send')).toBeInTheDocument();
    await waitFor(() => expect(shown?.features).toHaveLength(9), { timeout: 5_000 });
    await expect(view.state.doc.toString()).not.toContain('/feat');
  },
};

/** Cutting an embed's line takes the feature out of the spec and deletes it; nothing else moves. */
export const RemoveEmbed: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(embeds(canvasElement)).toHaveLength(8), { timeout: 10_000 });
    const [first] = embeds(canvasElement);
    const id = first.dataset.feature;
    const feature = shown?.features.find((ref) => ref.peek()?.id === id)?.peek();
    invariant(feature, 'Missing feature.');

    const view = await findView(canvasElement);
    const line = view.state.doc.lineAt(view.state.doc.toString().indexOf(`echo:///${id}`));
    view.dispatch({ changes: { from: line.from, to: line.to + 1 }, userEvent: 'delete.cut' });

    await waitFor(() => expect(embeds(canvasElement)).toHaveLength(7), { timeout: 5_000 });
    await waitFor(() => expect(Obj.isDeleted(feature)).toBe(true), { timeout: 5_000 });
    await expect(shown?.features).toHaveLength(7);
  },
};

/** A spec written as prose alone, before any of it is a feature; QA-7 walks it with no play of its own. */
export const Prose: Story = {
  args: { prose: true },
};

/**
 * A spec can start as prose and take structure a piece at a time: `/feature` makes a line a feature, an embed moves like
 * any line and the order of the spec follows, and the prose around the features stays as it was written.
 */
export const FromProse: Story = {
  ...Prose,
  play: async ({ canvasElement }) => {
    const view = await findView(canvasElement);
    await waitFor(() => expect(view.state.doc.toString()).toContain('Mail should feel instant.'), { timeout: 10_000 });
    await expect(embeds(canvasElement)).toHaveLength(0);

    const makeFeature = async (line: string) => {
      await userEvent.click(view.contentDOM.querySelector<HTMLElement>('.cm-line') ?? view.contentDOM);
      view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
      await userEvent.keyboard(`{Enter}${line} /feat`);
      await waitFor(() => expect(document.querySelector('.cm-tooltip-autocomplete')).not.toBeNull(), {
        timeout: 5_000,
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      await userEvent.keyboard('{Enter}');
    };
    await makeFeature('Instant inbox');
    await makeFeature('Search');
    await waitFor(() => expect(embeds(canvasElement)).toHaveLength(2), { timeout: 5_000 });
    await waitFor(() => expect(shown?.features.map((ref) => ref.peek()?.name)).toEqual(['Instant inbox', 'Search']), {
      timeout: 5_000,
    });

    // The cursor sits on the Search embed's line; moving the line up moves the feature up.
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    await waitFor(() => expect(shown?.features.map((ref) => ref.peek()?.name)).toEqual(['Search', 'Instant inbox']), {
      timeout: 5_000,
    });
    await expect(view.state.doc.toString()).toContain('Later, maybe: snooze, and sending at a set time.');
  },
};
