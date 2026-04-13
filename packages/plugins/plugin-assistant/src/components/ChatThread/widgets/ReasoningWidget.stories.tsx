//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ReasoningWidget } from './ReasoningWidget';

export type ReasoningWidgetStoryProps = {
  text: string;
  /** Passed through to the widget constructor for stable block identity (streaming). */
  pos?: string | number;
};

/**
 * Mounts the CodeMirror {@link ReasoningWidget} DOM in a React host so Storybook can theme it.
 */
const ReasoningWidgetDemo = ({ text, pos }: ReasoningWidgetStoryProps) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    host.replaceChildren();
    const widget = new ReasoningWidget(text, pos);
    const dom = widget.toDOM();
    host.appendChild(dom);
    widget.updateDOM(dom);

    return () => {
      widget.destroy(dom);
      host.replaceChildren();
    };
  }, [text, pos]);

  return <div ref={hostRef} className='w-[min(28rem,100vw)]' />;
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatThread/widgets/ReasoningWidget',
  component: ReasoningWidgetDemo,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ReasoningWidgetDemo>;

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
