//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '../../testing';
import { translations } from '../../translations';
import { Toolbar } from '../Toolbar';
import { Tooltip } from '../Tooltip';
import { SystemIconButton } from './SystemIconButton';

const iconOnly = { iconOnly: true, variant: 'ghost' as const };

const ToolbarStory = () => {
  const [state, setState] = useState({ star: false, bookmark: false, expander: false });

  return (
    <Tooltip.Provider>
      <Toolbar.Root>
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
        <Toolbar.Button asChild>
          <SystemIconButton.Expander
            {...iconOnly}
            active={state.expander}
            onClick={() => setState((prev) => ({ ...prev, expander: !prev.expander }))}
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
