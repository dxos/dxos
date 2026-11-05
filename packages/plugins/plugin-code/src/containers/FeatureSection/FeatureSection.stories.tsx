//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed, queryElement } from '@dxos/plugin-code/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';
import { Feature } from '#types';

import { FeatureSection } from './FeatureSection.tsx';

const FEATURE_NAME = 'Provider sync';

type StoryArgs = { attendableId: string; attended: boolean; narrow?: boolean };

const DefaultStory = ({ attendableId, attended, narrow }: StoryArgs) => {
  const [space] = useSpaces();
  const features = useQuery(space?.db, Filter.type(Feature.Feature));
  const feature = features.find((feature) => feature.name === FEATURE_NAME);
  if (!feature) {
    return <Loading data={{ db: !!space?.db, feature: !!feature }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames={narrow ? 'w-[16rem]' : 'contents'}>
      {/* Unattended, the section names an embed that nothing attends. */}
      <FeatureSection subject={feature} attendableId={attended ? undefined : `${attendableId}/${feature.id}`} />
    </AttendableContainer>
  );
};

const meta = {
  title: 'plugins/plugin-code/containers/FeatureSection',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
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
  args: { attendableId: 'test', attended: true },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Device state outlives a story, so each story sets the fold it needs. */
const setCollapsed = async (canvasElement: HTMLElement, collapsed: boolean) => {
  const toggle = await within(canvasElement).findByTestId('feature-section.collapse', undefined, { timeout: 10_000 });
  if ((toggle.getAttribute('aria-expanded') === 'true') === collapsed) {
    await userEvent.click(toggle);
  }
  await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe(String(!collapsed)));
};

/**
 * Each requirement's frame holds its editor, and its icon and id centre on its first line, not the middle of its
 * wrapped text.
 */
const expectRequirementLayout = async (canvasElement: HTMLElement) => {
  for (const frame of within(canvasElement).getAllByTestId(/^requirement-editor\.\d+\.text$/)) {
    const editor = queryElement(frame, '.cm-editor');
    await expect(frame.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(editor.getBoundingClientRect().bottom);
    const line = queryElement(editor, '.cm-line');
    const lineCentre = line.getBoundingClientRect().top + parseFloat(getComputedStyle(line).lineHeight) / 2;
    const row = frame.closest<HTMLElement>('.dx-card-row');
    invariant(row, 'Missing requirement row.');
    for (const element of [queryElement(row, '.dx-icon'), within(row).getByText(/^F-\d+\.\d+$/)]) {
      const { top, height } = element.getBoundingClientRect();
      await expect(Math.abs(top + height / 2 - lineCentre)).toBeLessThanOrEqual(2);
    }
  }
};

/** Attended: the header row, description, requirements and the features it needs. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await setCollapsed(canvasElement, false);
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('name', undefined, { timeout: 10_000 })).toHaveTextContent(FEATURE_NAME);
    await expect(canvas.getByTestId('feature-section.block-id').textContent).toMatch(/F-3/);
    await expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(3);
    await expect(canvas.getByTestId('requirement-editor.add')).toBeInTheDocument();
    await expectRequirementLayout(canvasElement);
    const dependencies = within(
      await canvas.findByTestId('feature-section.dependencies', undefined, { timeout: 10_000 }),
    );
    await expect(await dependencies.findByText('OAuth tokens')).toBeInTheDocument();
  },
};

/** Not attended, as an embed reads in the document: no add actions, and rows hide while they are empty. */
export const Unattended: Story = {
  args: { attended: false },
  play: async ({ canvasElement }) => {
    await setCollapsed(canvasElement, false);
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('name', undefined, { timeout: 10_000 })).toHaveTextContent(FEATURE_NAME);
    await expect(canvas.queryByTestId('requirement-editor.add')).toBeNull();
    await expect(canvas.queryByTestId('requirement-editor.0.remove')).toBeNull();
    await expectRequirementLayout(canvasElement);
  },
};

/**
 * Narrow, as in a document beside a companion: a requirement that wraps grows its row rather than spilling over the next,
 * and keeps its icon and id on its first line.
 */
export const Wrapped: Story = {
  args: { attended: false, narrow: true },
  play: async ({ canvasElement }) => {
    await setCollapsed(canvasElement, false);
    const canvas = within(canvasElement);
    const frame = await canvas.findByTestId('requirement-editor.0.text', undefined, { timeout: 10_000 });
    const editor = queryElement(frame, '.cm-editor');
    const lineHeight = parseFloat(getComputedStyle(queryElement(editor, '.cm-line')).lineHeight);
    await waitFor(() => expect(editor.offsetHeight).toBeGreaterThan(lineHeight * 1.5));
    await expectRequirementLayout(canvasElement);
  },
};

/** Folded to its header row: the block ids of the features it needs and the requirement count, beside the status. */
export const Collapsed: Story = {
  play: async ({ canvasElement }) => {
    await setCollapsed(canvasElement, true);
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('requirement-editor')).toBeNull();
    await expect(canvas.getByTestId('feature-section.requirement-count').textContent).toBe('3 requirements');
    await expect(canvas.getByTestId('feature-section.dependency').textContent).toBe('F-2');
  },
};
