//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { useOptionalAtomCapabilityState, useOptionalCapabilities } from '@dxos/app-framework/ui';
import { type Settings, TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { DropdownMenu, Icon, IconButton, MicButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type ChatEvent } from '../Chat/events';

export type ChatActionsProps = ThemedClassName<
  PropsWithChildren<{
    docId?: string;
    microphone?: boolean;
    processing?: boolean;
    debug?: boolean;
    onEvent?: (event: ChatEvent) => void;
  }>
>;

type AudioInputDevice = {
  deviceId: string;
  label: string;
};

export const ChatActions = ({
  classNames,
  children,
  docId,
  microphone,
  processing,
  debug,
  onEvent,
}: ChatActionsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Voice input is optional: the transcription plugin contributes these capabilities. Tolerate its
  // absence so the chat prompt still renders (e.g. in stories that do not load the plugin).
  const transcriptionAvailable = useOptionalCapabilities(TranscriptionCapabilities.RecordingSession).length > 0;
  const [session, setSession] = useOptionalAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const [settings, setSettings] = useOptionalAtomCapabilityState(TranscriptionCapabilities.Settings);

  const recording = !!session?.recording && session.id === docId;
  const recordMode: Settings.RecordMode = settings?.recordMode ?? 'toggle';
  const entityExtraction = settings?.entityExtraction !== false;
  const selectedDeviceId = settings?.audioDeviceId ?? '';

  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const all = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) {
        return;
      }
      // Labels are blank until microphone permission is granted; fall back to an ordinal name.
      setDevices(
        all
          .filter((device) => device.kind === 'audioinput' && device.deviceId)
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${index + 1}`,
          })),
      );
    };
    void refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (!docId) {
      return;
    }
    setSession((current) => (current?.recording && current.id === docId ? null : { id: docId, recording: true }));
  }, [setSession, docId]);

  const handlePressStart = useCallback(() => {
    if (!docId) {
      return;
    }
    setSession(() => ({ id: docId, recording: true }));
  }, [setSession, docId]);

  const handlePressEnd = useCallback(() => {
    setSession((current) => (current?.id === docId ? null : current));
  }, [setSession, docId]);

  const handleRecordModeChange = useCallback(
    (mode: Settings.RecordMode) => setSettings((current) => ({ ...current, recordMode: mode })),
    [setSettings],
  );

  const handleEntityExtractionChange = useCallback(
    (value: boolean) => setSettings((current) => ({ ...current, entityExtraction: value })),
    [setSettings],
  );

  const handleSelectDevice = useCallback(
    (deviceId: string) => setSettings((current) => ({ ...current, audioDeviceId: deviceId || undefined })),
    [setSettings],
  );

  const recordLabel = recording
    ? t('stop-recording.label')
    : recordMode === 'hold'
      ? t('hold-to-record.label')
      : t('start-recording.label');

  return (
    <div className={mx('flex items-center', classNames)}>
      {children}

      {microphone && docId && transcriptionAvailable && (
        <>
          <MicButton
            iconOnly
            variant='ghost'
            label={recordLabel}
            recording={recording}
            mode={recordMode}
            onToggle={handleToggle}
            onPressStart={handlePressStart}
            onPressEnd={handlePressEnd}
            data-testid='assistant.record'
          />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <IconButton
                icon='ph--caret-down--regular'
                iconOnly
                label={t('recording-options.label')}
                variant='ghost'
                classNames='w-4'
                data-testid='assistant.record.options'
              />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  <DropdownMenu.GroupLabel>{t('record-mode.label')}</DropdownMenu.GroupLabel>
                  <SettingsSelectableItem
                    label={t('record-mode.toggle.label')}
                    selected={recordMode === 'toggle'}
                    onSelect={() => handleRecordModeChange('toggle')}
                  />
                  <SettingsSelectableItem
                    label={t('record-mode.hold.label')}
                    selected={recordMode === 'hold'}
                    onSelect={() => handleRecordModeChange('hold')}
                  />

                  <DropdownMenu.Separator />

                  <DropdownMenu.GroupLabel>{t('audio-device.label')}</DropdownMenu.GroupLabel>
                  <SettingsSelectableItem
                    label={t('audio-device.default.label')}
                    selected={selectedDeviceId === ''}
                    onSelect={() => handleSelectDevice('')}
                  />
                  {devices.map((device) => (
                    <SettingsSelectableItem
                      key={device.deviceId}
                      label={device.label}
                      selected={selectedDeviceId === device.deviceId}
                      onSelect={() => handleSelectDevice(device.deviceId)}
                    />
                  ))}

                  <DropdownMenu.Separator />

                  <DropdownMenu.CheckboxItem
                    checked={entityExtraction}
                    onCheckedChange={handleEntityExtractionChange}
                    classNames='gap-2'
                    data-testid='assistant.entity-extraction'
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
        </>
      )}

      {debug && (
        <IconButton
          variant='ghost'
          icon='ph--wrench--regular'
          iconOnly
          label={t('debug.button')}
          onClick={() => onEvent?.({ type: 'toggle-debug' })}
        />
      )}

      <IconButton
        // disabled={!processing} // TODO(dmaretskyi): Set processing state correctly on rehydrated agents.
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label={t('cancel-processing.button')}
        onClick={() => {
          onEvent?.({ type: 'cancel' });
        }}
      />
    </div>
  );
};

type SettingsSelectableItemProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

// The design system's `DropdownMenu.RadioItem` renders a plain item (no radio semantics), so
// single-select is modelled with a plain item and an explicit trailing check. `onSelect` (not
// `onClick`) so keyboard activation works.
const SettingsSelectableItem = ({ label, selected, onSelect }: SettingsSelectableItemProps) => (
  <DropdownMenu.Item classNames='gap-2' role='menuitemradio' aria-checked={selected} onSelect={onSelect}>
    <span className='grow truncate'>{label}</span>
    {selected && <Icon icon='ph--check--regular' size={4} />}
  </DropdownMenu.Item>
);
