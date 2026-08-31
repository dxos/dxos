//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, within } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../../testing';
import { Toolbar } from '../Toolbar';
import { Tooltip } from '../Tooltip';
import { SystemIconButton } from './SystemIconButton';

const iconOnly = { iconOnly: true, variant: 'ghost' as const };

const ToolbarStory = () => {
  const [state, setState] = useState({ star: false, bookmark: false, disclosure: false });

  return (
    <Tooltip.Provider>
      <Toolbar.Root>
        <Toolbar.Button asChild>
          <SystemIconButton.Disclosure
            {...iconOnly}
            active={state.disclosure}
            onClick={() => setState((prev) => ({ ...prev, disclosure: !prev.disclosure }))}
          />
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <SystemIconButton.Star
            {...iconOnly}
            active={state.star}
            onClick={() => setState((prev) => ({ ...prev, star: !prev.star }))}
          />
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <SystemIconButton.Bookmark
            {...iconOnly}
            active={state.bookmark}
            onClick={() => setState((prev) => ({ ...prev, bookmark: !prev.bookmark }))}
          />
        </Toolbar.Button>
        <Toolbar.Separator variant='line' />
        <Toolbar.Button asChild>
          <SystemIconButton.Add {...iconOnly} />
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <SystemIconButton.Edit {...iconOnly} />
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <SystemIconButton.Delete {...iconOnly} />
        </Toolbar.Button>
        <Toolbar.Separator variant='line' />
        <Toolbar.Button asChild>
          <SystemIconButton.Clipboard {...iconOnly} onCopy={() => 'Copied from toolbar'} />
        </Toolbar.Button>
        <SystemIconButton.Upload {...iconOnly} accept='*/*' />
        <Toolbar.Button asChild>
          <SystemIconButton.Download
            {...iconOnly}
            filename='example.txt'
            onDownload={() => new Blob(['Hello from SystemIconButton'])}
          />
        </Toolbar.Button>
        <Toolbar.Separator variant='line' />
        <Toolbar.Button asChild>
          <SystemIconButton.Close {...iconOnly} />
        </Toolbar.Button>
      </Toolbar.Root>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/SystemIconButton',
  component: SystemIconButton.Add,
  render: ToolbarStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof SystemIconButton.Add>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

/**
 * The disclosure reports `aria-expanded`, which is what makes it a disclosure rather than a caret
 * that happens to rotate — the label alone leaves the state implicit. Star and Bookmark are toggle
 * buttons, not disclosures, so they must NOT carry it.
 */
export const TestDisclosureReportsExpanded: Story = {
  args: {},
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const disclosure = await canvas.findByRole('button', { name: 'Expand' }, { timeout: 10_000 });
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(disclosure);
    const expanded = await canvas.findByRole('button', { name: 'Collapse' }, { timeout: 10_000 });
    await expect(expanded).toHaveAttribute('aria-expanded', 'true');

    // A toggle button's state is `aria-pressed`; borrowing `aria-expanded` would promise a region
    // that neither of these controls has.
    await expect(canvas.getByRole('button', { name: 'Star' })).not.toHaveAttribute('aria-expanded');
  },
};
