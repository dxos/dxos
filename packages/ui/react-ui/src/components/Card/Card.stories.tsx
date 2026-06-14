//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { random } from '@dxos/random';
import { Icon, IconButton } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Card } from './Card';

random.seed(0);

type DefaultStoryProps = {
  title: string;
  description?: string;
  image?: string;
  fullWidth?: boolean;
};

const DefaultStory = ({ title, description, image, fullWidth }: DefaultStoryProps) => {
  const handleRef = useRef<HTMLButtonElement>(null);
  console.log(title);
  return (
    <Card.Root fullWidth={fullWidth}>
      <Card.Header>
        <Card.DragHandle ref={handleRef} />
        <Card.Title>{title}</Card.Title>
        <Card.ActionIconButton action='close' onClick={() => console.log('close')} />
      </Card.Header>
      <Card.Body>
        <Card.Poster alt='Card.Poster' image={image} />
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--dot-outline--regular' />
          </Card.Block>
          <Card.Text>Card.Text (default)</Card.Text>
        </Card.Row>
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--dot-outline--regular' />
          </Card.Block>
          <Card.Text variant='description'>
            Card.Text (description)
            <br />
            {description}
          </Card.Text>
        </Card.Row>
        <Card.Action label='Card.Action' onClick={() => console.log('action')} />
        <Card.Link label='Card.Link' href='https://dxos.org' />
      </Card.Body>
    </Card.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Card',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'grid w-[30rem] place-items-center' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const image = random.image.url();

export const Default: Story = {
  args: {
    title: random.commerce.productName(),
    description: random.lorem.paragraph(3),
    image,
  },
};

export const FullWidth: Story = {
  args: {
    title: random.commerce.productName(),
    description: random.lorem.paragraph(3),
    image,
    fullWidth: true,
  },
};

export const Simple: Story = {
  args: {
    title: random.commerce.productName(),
  },
  render: ({ title }) => {
    const handleRef = useRef<HTMLButtonElement>(null);
    return (
      <Card.Root>
        <Card.Header>
          <Card.DragHandle ref={handleRef} />
          <Card.Title>{title}</Card.Title>
          <Card.ActionIconButton action='close' onClick={() => console.log('close')} />
        </Card.Header>
      </Card.Root>
    );
  },
};

export const Section: Story = {
  args: {
    title: random.commerce.productName(),
  },
  render: ({ title }) => {
    const handleRef = useRef<HTMLButtonElement>(null);
    return (
      <Card.Root>
        <Card.Header>
          <Card.DragHandle ref={handleRef} />
          <Card.Title>{title}</Card.Title>
          <Card.ActionIconButton action='close' onClick={() => console.log('close')} />
        </Card.Header>
        <Card.Body>
          <Card.Section title='Recent'>
            <Card.Action label='First action' icon='ph--calendar-dot--regular' onClick={() => console.log('1')} />
            <Card.Action label='Second action' icon='ph--calendar-dot--regular' onClick={() => console.log('2')} />
          </Card.Section>
          <Card.Section title='Upcoming'>
            <Card.Action label='Third action' icon='ph--calendar-dot--regular' onClick={() => console.log('3')} />
          </Card.Section>
        </Card.Body>
      </Card.Root>
    );
  },
};

export const Description: Story = {
  args: {
    title: random.commerce.productName(),
    description: random.lorem.paragraph(3),
  },
  render: ({ title, description }) => {
    const handleRef = useRef<HTMLButtonElement>(null);
    return (
      <Card.Root>
        <Card.Header>
          <Card.DragHandle ref={handleRef} />
          <Card.Title>{title}</Card.Title>
          <Card.ActionIconButton action='close' onClick={() => console.log('close')} />
        </Card.Header>
        <Card.Body>
          <Card.Row>
            <Card.Text variant='description'>{description}</Card.Text>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    );
  },
};

export const Slots: Story = {
  args: {
    title: random.commerce.productName(),
  },
  render: ({ title }) => {
    const showLeading = true;
    return (
      <Card.Root>
        <Card.Header>
          <Card.Title>{title}</Card.Title>
          <Card.ActionIconButton action='close' onClick={() => console.log('close')} />
        </Card.Header>
        <Card.Body>
          {/* Leading passive icon. */}
          <Card.Row>
            <Card.Block>
              <Icon icon='ph--user--regular' />
            </Card.Block>
            <Card.Text>Start slot — passive Icon</Card.Text>
          </Card.Row>
          {/* Passive icon + trailing IconButton: the two gutters align to the pixel. */}
          <Card.Row>
            <Card.Block>
              <Icon icon='ph--at--regular' />
            </Card.Block>
            <Card.Text>Start Icon + end IconButton (aligned)</Card.Text>
            <Card.Block end>
              <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Remove' onClick={() => {}} />
            </Card.Block>
          </Card.Row>
          {/* Conditional leading slot: when falsy, content stays in the center track. */}
          <Card.Row>
            {showLeading && (
              <Card.Block>
                <Icon icon='ph--calendar--regular' />
              </Card.Block>
            )}
            <Card.Text>Conditional start slot</Card.Text>
          </Card.Row>
          {/* asChild: the anchor itself becomes the trailing gutter cell. */}
          <Card.Row>
            <Card.Text>Trailing link via asChild</Card.Text>
            <Card.Block end asChild>
              <a href='https://dxos.org' target='_blank' rel='noreferrer'>
                <Icon icon='ph--arrow-square-out--regular' />
              </a>
            </Card.Block>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    );
  },
};

export const Mock = () => (
  <div className='grid grid-cols-[2rem_1fr_2rem] w-full dx-card-min-width dx-card-max-width border border-separator rounded-xs'>
    <div className='grid grid-cols-subgrid col-span-full'>
      <div className='grid h-[var(--dx-rail-item)] w-[var(--dx-rail-item)] place-items-center'>
        <Icon icon='ph--dots-six-vertical--regular' />
      </div>
      <div className='p-1 whitespace-normal break-words text-description items-center'>
        This line is very very long and it should wrap.
      </div>
      <div className='grid h-[var(--dx-rail-item)] w-[var(--dx-rail-item)] place-items-center'>
        <Icon icon='ph--x--regular' />
      </div>
    </div>
    <div className='grid grid-cols-subgrid col-span-3'>
      <div className='grid h-[var(--dx-rail-item)] w-[var(--dx-rail-item)] place-items-center'>
        <Icon icon='ph--dots-six-vertical--regular' />
      </div>
      <div className='p-1 text-description items-center col-span-2'>
        This line is very very long and it should wrap.
      </div>
    </div>
  </div>
);
