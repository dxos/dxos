//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ReasoningWidget } from './ReasoningWidget';

export type DefaultStoryProps = {
  text: string;
};

// TODO(burdon): Generalize factory for DOM widgets.
const DefaultStory = ({ text }: DefaultStoryProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    host.replaceChildren();
    const widget = new ReasoningWidget(text, 0);
    const dom = widget.toDOM();
    host.appendChild(dom);
    widget.updateDOM(dom);
    return () => {
      widget.destroy(dom);
      host.replaceChildren();
    };
  }, [text]);

  return <div ref={hostRef} />;
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatThread/widgets/ReasoningWidget',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'The user is asking about nested flex layouts and overflow. I should mention min-height 0 and grid track sizing.',
  },
};

export const LongText: Story = {
  args: {
    text: [
      'Step 1: Identify the scroll container and ensure it participates in a definite height chain.',
      'Step 2: Apply min-h-0 to flex children that should shrink and scroll.',
      'Step 3: Prefer overflow-y-auto on the leaf viewport, not on every ancestor.',
      'Step 4: Use min-h-0 on the scroll container to ensure it participates in a definite height chain.',
      'Step 5: Use min-w-0 on the scroll container to ensure it participates in a definite width chain.',
    ].join('\n\n'),
  },
};
