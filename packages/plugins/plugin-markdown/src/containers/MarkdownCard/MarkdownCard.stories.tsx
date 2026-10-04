//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ObjectCard } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { random } from '@dxos/random';
import { Card } from '@dxos/react-ui';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { MarkdownCard, type MarkdownCardProps } from './MarkdownCard.tsx';

random.seed(1234);

const MarkdownCardStory = ({ ...args }: Omit<MarkdownCardProps, 'subject'>) => {
  const subject = useMemo(
    () =>
      Markdown.make({
        name: random.lorem.words(3),
        content: '# Title\n' + random.lorem.paragraphs(5),
      }),
    [],
  );

  return (
    <CardContainer icon='ph--text-aa--regular'>
      {/* The host the app uses (a grid card with rails), so the story lays the card out as the app does. */}
      <ObjectCard.Root border={false}>
        <ObjectCard.Header subject={subject} />
        <MarkdownCard subject={subject} {...args} />
      </ObjectCard.Root>
    </CardContainer>
  );
};

const meta: Meta<typeof MarkdownCardStory> = {
  title: 'plugins/plugin-markdown/containers/MarkdownCard',
  component: MarkdownCardStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [ProcessManagerPlugin(), ClientPlugin.make({})],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Content lengths side by side. The snippet preview is a fixed 16:9 box, so all three cards must be
 * the same height — a long document clips under the fade rather than growing its card. Regression
 * net for the case where the preview had a ratio floor and a separate pixel cap, and each card's
 * height landed wherever its content did.
 */
const ComparisonStory = () => {
  const subjects = useMemo(
    () => [
      Markdown.make({ name: 'Long', content: '# Title\n' + random.lorem.paragraphs(5) }),
      Markdown.make({ name: 'Short', content: '# Hello\n\nOne line.' }),
      Markdown.make({ name: 'Empty', content: '' }),
    ],
    [],
  );

  return (
    <div className='flex items-start gap-4'>
      {subjects.map((subject) => (
        <CardContainer key={subject.id} icon='ph--text-aa--regular'>
          <Card.Root border={false}>
            <Card.Header>
              <Card.Title>{Obj.getLabel(subject)}</Card.Title>
            </Card.Header>
            <MarkdownCard subject={subject} />
          </Card.Root>
        </CardContainer>
      ))}
    </div>
  );
};

export const Comparison: Story = {
  render: ComparisonStory,
};

/** The word count spans the card's rails as the snippet does, so both start at the same edge. */
export const TestWordCountAligned: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const words = canvasElement.querySelector<HTMLElement>('[data-testid="markdown.card.words"]');
        const line = canvasElement.querySelector<HTMLElement>('.cm-line');
        if (!words || !line) {
          throw new Error('Card not rendered.');
        }
        const range = canvasElement.ownerDocument.createRange();
        range.selectNodeContents(words);
        const wordsLeft = range.getBoundingClientRect().left;
        range.selectNodeContents(line);
        await expect(Math.abs(wordsLeft - range.getBoundingClientRect().left)).toBeLessThanOrEqual(2);
      },
      { timeout: 10_000 },
    );
  },
};
