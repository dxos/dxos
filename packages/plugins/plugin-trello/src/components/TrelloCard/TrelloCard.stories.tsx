//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Trello } from '#types';

import { translations } from '../../translations';
import { TrelloCard } from './TrelloCard';

const meta = {
  title: 'plugins/plugin-trello/components/TrelloCard',
  component: TrelloCard,
  decorators: [withTheme(), withLayout({ classNames: 'p-4 max-w-md' })],
  parameters: { translations },
} satisfies Meta<typeof TrelloCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseCard = (overrides: Partial<Trello.TrelloCard> = {}): Trello.TrelloCard =>
  ({
    ...Trello.makeCard({
      trelloCardId: 'card-1',
      name: 'Outline Q3 product strategy',
      description: 'Capture the strategic priorities and tradeoffs for the Q3 roadmap, then circulate to leads.',
      listName: 'Backlog',
      trelloListId: 'list-1',
      url: 'https://trello.com/c/example',
    }),
    ...overrides,
  }) as Trello.TrelloCard;

export const Default: Story = { args: { card: baseCard() } };

export const TitleOnly: Story = {
  args: { card: baseCard({ description: undefined }) },
};

export const NoUrl: Story = {
  args: { card: baseCard({ url: undefined }) },
};
