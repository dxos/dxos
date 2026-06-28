//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { DropdownMenu, Icon, IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Settings } from '#types';

export type AudioInputDevice = {
  deviceId: string;
  label: string;
};

export type MicSettingsProps = {
  recordMode: Settings.RecordMode;
  entityExtraction: boolean;
  devices: AudioInputDevice[];
  /** Empty string selects the system default device. */
  selectedDeviceId: string;
  onRecordModeChange: (mode: Settings.RecordMode) => void;
  onEntityExtractionChange: (value: boolean) => void;
  onSelectDevice: (deviceId: string) => void;
};

/**
 * Dropdown of recording options for the mic: record mode (toggle/push-to-talk), the input device,
 * and whether entity extraction is applied. Presentational — state lives in the container.
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
  const { t } = useTranslation(meta.profile.key);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton
          icon='ph--caret-down--regular'
          iconOnly
          label={t('recording-options.label')}
          variant='ghost'
          // Half-width slim caret abutting the mic (split-control affordance).
          classNames='w-4'
          data-testid='transcription.record.options'
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <DropdownMenu.GroupLabel>{t('record-mode.label')}</DropdownMenu.GroupLabel>
            <SelectableItem
              label={t('record-mode.toggle.label')}
              selected={recordMode === 'toggle'}
              onSelect={() => onRecordModeChange('toggle')}
            />
            <SelectableItem
              label={t('record-mode.hold.label')}
              selected={recordMode === 'hold'}
              onSelect={() => onRecordModeChange('hold')}
            />

            <DropdownMenu.Separator />

            <DropdownMenu.GroupLabel>{t('audio-device.label')}</DropdownMenu.GroupLabel>
            <SelectableItem
              label={t('audio-device.default.label')}
              selected={selectedDeviceId === ''}
              onSelect={() => onSelectDevice('')}
            />
            {devices.map((device) => (
              <SelectableItem
                key={device.deviceId}
                label={device.label}
                selected={selectedDeviceId === device.deviceId}
                onSelect={() => onSelectDevice(device.deviceId)}
              />
            ))}

            <DropdownMenu.Separator />

            <DropdownMenu.CheckboxItem
              checked={entityExtraction}
              onCheckedChange={onEntityExtractionChange}
              classNames='gap-2'
              data-testid='transcription.entity-extraction'
            >
              <span className='grow truncate'>{t('settings.entity-extraction.label')}</span>
              <DropdownMenu.ItemIndicator asChild>
                <Icon icon='ph--check--regular' size={4} />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.CheckboxItem>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

type SelectableItemProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

// The design system's `DropdownMenu.RadioItem` renders a plain item (no radio semantics), so
// single-select is modelled with a plain item and an explicit trailing check.
const SelectableItem = ({ label, selected, onSelect }: SelectableItemProps) => (
  <DropdownMenu.Item classNames='gap-2' onClick={onSelect}>
    <span className='grow truncate'>{label}</span>
    {selected && <Icon icon='ph--check--regular' size={4} />}
  </DropdownMenu.Item>
);
