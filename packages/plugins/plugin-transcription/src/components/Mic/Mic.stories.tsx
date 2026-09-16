//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { SystemIconButton, Toolbar } from '@dxos/react-ui';
import { type AudioInputDevice, MicSettings, type RecordMode } from '@dxos/react-ui-transcription';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

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
      <SystemIconButton.Mic
        iconOnly
        variant='ghost'
        label={recording ? 'Stop recording' : recordMode === 'hold' ? 'Hold to record' : 'Start recording'}
        recording={recording}
        mode={recordMode}
        onPressStart={() => setRecording(true)}
        onPressEnd={() => setRecording(false)}
        onToggle={() => setRecording((value) => !value)}
      />
      <MicSettings
        devices={DEVICES}
        recordMode={recordMode}
        entityExtraction={entityExtraction}
        selectedDeviceId={selectedDeviceId}
        onEntityExtractionChange={setEntityExtraction}
        onRecordModeChange={setRecordMode}
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
