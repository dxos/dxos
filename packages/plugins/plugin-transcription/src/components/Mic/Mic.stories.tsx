//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { MicButton, Toolbar } from '@dxos/react-ui';
import { type AudioInputDevice, type RecordMode, MicSettings } from '@dxos/react-ui-transcription';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

const DEVICES: AudioInputDevice[] = [
  { deviceId: 'default', label: 'Default — MacBook Pro Microphone' },
  { deviceId: 'usb-1', label: 'USB Audio Interface' },
  { deviceId: 'bt-1', label: 'AirPods Pro' },
];

// Drives the presentational pieces from local state so the dropdown, mode switch, and
// press-and-hold can be exercised without capabilities.
const DefaultStory = () => {
  const [recording, setRecording] = useState(false);
  const [recordMode, setRecordMode] = useState<RecordMode>('toggle');
  const [entityExtraction, setEntityExtraction] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  return (
    <Toolbar.Root>
      <MicButton
        iconOnly
        variant='ghost'
        label={recording ? 'Stop recording' : recordMode === 'hold' ? 'Hold to record' : 'Start recording'}
        recording={recording}
        mode={recordMode}
        onToggle={() => setRecording((value) => !value)}
        onPressStart={() => setRecording(true)}
        onPressEnd={() => setRecording(false)}
      />
      <MicSettings
        translationNs={pluginMeta.profile.key}
        recordMode={recordMode}
        entityExtraction={entityExtraction}
        devices={DEVICES}
        selectedDeviceId={selectedDeviceId}
        onRecordModeChange={setRecordMode}
        onEntityExtractionChange={setEntityExtraction}
        onSelectDevice={setSelectedDeviceId}
      />
    </Toolbar.Root>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/components/Mic',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
