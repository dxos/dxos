//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as MenuButton from '@dxos/react-ui/MenuButton';

import { type AudioInputDevice } from '../../capture/index.ts';
import { translationKey } from '../../translations.ts';

/** Recording trigger mode: toggle on/off, or hold-to-record (push-to-talk). */
export type RecordMode = 'toggle' | 'hold';

export type MicSettingsProps = {
  recordMode: RecordMode;
  entityExtraction: boolean;
  devices: AudioInputDevice[];
  /** Empty string selects the system default device. */
  selectedDeviceId: string;
  onRecordModeChange: (mode: RecordMode) => void;
  onEntityExtractionChange: (value: boolean) => void;
  onSelectDevice: (deviceId: string) => void;
};

/**
 * Recording options for the mic: record mode (toggle/push-to-talk), the input device, and whether
 * entity extraction is applied. Presentational — state lives in the consumer.
 *
 * The menu itself is `MenuButton`: what is specific here is which options exist, not how a caret
 * opens a list of them.
 */
export const MicSettings = ({
  recordMode,
  entityExtraction,
  devices,
  selectedDeviceId,
  onRecordModeChange,
  onEntityExtractionChange,
  onSelectDevice,
}: MicSettingsProps) => {
  const { t } = Hooks.useTranslation(translationKey);

  const items: MenuButton.Item[] = [
    { type: 'group', label: t('record-mode.label') },
    {
      type: 'option',
      label: t('record-mode.toggle.label'),
      selected: recordMode === 'toggle',
      onSelect: () => onRecordModeChange('toggle'),
    },
    {
      type: 'option',
      label: t('record-mode.hold.label'),
      selected: recordMode === 'hold',
      onSelect: () => onRecordModeChange('hold'),
    },
    {
      type: 'separator',
    },
    {
      type: 'group',
      label: t('audio-device.label'),
    },
    {
      type: 'option',
      label: t('audio-device.default.label'),
      selected: selectedDeviceId === '',
      onSelect: () => onSelectDevice(''),
    },
    ...devices.map((device): MenuButton.Item => ({
      type: 'option',
      label: device.label,
      selected: selectedDeviceId === device.deviceId,
      onSelect: () => onSelectDevice(device.deviceId),
    })),
    { type: 'separator' },
    {
      type: 'checkbox',
      label: t('settings.entity-extraction.label'),
      checked: entityExtraction,
      onCheckedChange: onEntityExtractionChange,
      testId: 'transcription.entity-extraction',
    },
  ];

  return (
    <MenuButton.Root
      icon='ph--caret-down--regular'
      iconOnly
      compact
      variant='ghost'
      label={t('recording-options.label')}
      data-testid='transcription.record.options'
      items={items}
    />
  );
};
