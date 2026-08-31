//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { translations } from '#translations';

import { withTheme } from '../../testing';
import { Toolbar } from '../Toolbar';
import { Tooltip } from '../Tooltip';
import { SystemIconButton } from './SystemIconButton';

const iconOnly = { iconOnly: true, variant: 'ghost' as const };

type StoryArgs = {};

const ToolbarStory = (_: StoryArgs) => {
  const [state, setState] = useState({ star: false, bookmark: false, disclosure: false, recording: false });

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
        <Toolbar.Button asChild>
          <SystemIconButton.Clipboard {...iconOnly} onCopy={() => 'Copied from toolbar'} />
        </Toolbar.Button>
        <Toolbar.Separator variant='line' />
        <Toolbar.Button asChild>
          <SystemIconButton.Mic
            {...iconOnly}
            label={state.recording ? 'Stop recording' : 'Start recording'}
            recording={state.recording}
            onToggle={() => setState((prev) => ({ ...prev, recording: !prev.recording }))}
            onPressStart={() => setState((prev) => ({ ...prev, recording: true }))}
            onPressEnd={() => setState((prev) => ({ ...prev, recording: false }))}
          />
        </Toolbar.Button>
        <Toolbar.Separator variant='line' />
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
          <SystemIconButton.Add {...iconOnly} />
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <SystemIconButton.Edit {...iconOnly} />
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <SystemIconButton.Delete {...iconOnly} />
        </Toolbar.Button>
        <Toolbar.Button asChild>
          <SystemIconButton.Close {...iconOnly} />
        </Toolbar.Button>
      </Toolbar.Root>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/SystemIconButton',
  render: ToolbarStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {};
