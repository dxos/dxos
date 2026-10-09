//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import * as Card from '@dxos/react-ui/Card';
import * as Menu from '@dxos/react-ui/Menu';
import { withTheme } from '@dxos/react-ui/testing';
import { Organization } from '@dxos/types';

import { ObjectCard } from './ObjectCard.tsx';

type StoryProps = {
  name: string;
  /** Overrides the object's label. */
  title?: string;
};

const DefaultStory = ({ name, title }: StoryProps) => {
  const object = useMemo(() => Obj.make(Organization.Organization, { name }), [name]);
  return (
    <ObjectCard.Root classNames='dx-card-min-width' data-testid='object-card'>
      <ObjectCard.Header
        subject={object}
        menu={
          <Card.Menu label='Actions'>
            <Menu.Item item={{ value: 'open', label: 'Open', icon: 'ph--arrow-square-out--regular' }} />
          </Card.Menu>
        }
      >
        {title}
      </ObjectCard.Header>
      <Card.Body>
        <Card.Row>
          <Card.Text variant='muted'>{name}</Card.Text>
        </Card.Row>
      </Card.Body>
    </ObjectCard.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'sdk/app-toolkit/components/ObjectCard',
  render: DefaultStory,
  // `CardIconSlot` asks the surface manager for a `CardIcon` contribution.
  decorators: [withTheme(), withPluginManager()],
  parameters: { layout: 'centered' },
  args: {
    name: 'Acme',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Title: Story = {
  args: {
    title: 'Custom title',
  },
};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = await canvas.findByTestId('object-card');
    await expect(card).toHaveAttribute('data-grid');
    const icon = card.querySelector('[data-part="header"] [data-scope="icon"]');
    await expect(icon).toHaveAttribute('data-icon', 'ph--building-office--regular');
    await expect(within(card).getByRole('heading')).toHaveTextContent('Acme');
  },
};
