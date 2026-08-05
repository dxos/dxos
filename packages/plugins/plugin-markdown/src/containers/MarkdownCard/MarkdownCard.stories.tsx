//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { Markdown } from '@dxos/plugin-markdown';
import { random } from '@dxos/random';
import { Card } from '@dxos/react-ui';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { MarkdownCard, type MarkdownCardProps } from './MarkdownCard';

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
      <Card.Root border={false}>
        <Card.Header>
          <Card.DragHandle />
          <Card.Title>{Obj.getLabel(subject)}</Card.Title>
          <Card.Menu />
        </Card.Header>
        <MarkdownCard subject={subject} {...args} />
      </Card.Root>
    </CardContainer>
  );
};

const meta: Meta<typeof MarkdownCardStory> = {
  title: 'plugins/plugin-markdown/containers/MarkdownCard',
  component: MarkdownCardStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [ProcessManagerPlugin(), ClientPlugin({})],
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
