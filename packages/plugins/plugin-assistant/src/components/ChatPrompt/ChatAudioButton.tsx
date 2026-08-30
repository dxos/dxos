//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useOperationInvoker, useOptionalAtomCapabilityState, useOptionalCapabilities } from '@dxos/app-framework/ui';
import type * as Settings from '@dxos/plugin-transcription/Settings';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import { DropdownMenu, Icon, IconButton, MicButton, useTranslation } from '@dxos/react-ui';
import {
  type AudioInputDevice,
  installMicrophoneBridge,
  listAudioInputs,
  setPreferredAudioInput,
} from '@dxos/react-ui-transcription';

import { meta } from '#meta';

export type ChatAudioButtonProps = {
  /** Recording session key — the chat the dictation belongs to. Absent, there is nothing to record into. */
  docId?: string;
};

/**
 * Dictation: a mic button paired with the menu that configures it (press mode, input device, entity
 * extraction).
 *
 * Its own component because nothing it needs — the transcription capabilities, the device
 * enumeration, the permission probe — is touched by the rest of the action row, and it is absent
 * entirely wherever the transcription plugin is not loaded.
 */
export const ChatAudioButton = ({ docId }: ChatAudioButtonProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Voice input is optional: the transcription plugin contributes these capabilities. Tolerate its
  // absence so the chat prompt still renders (e.g. in stories that do not load the plugin).
  const transcriptionAvailable = useOptionalCapabilities(TranscriptionCapabilities.RecordingSession).length > 0;
  const [session, setSession] = useOptionalAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const { invokePromise } = useOperationInvoker();
  const [settings, setSettings] = useOptionalAtomCapabilityState(TranscriptionCapabilities.Settings);

  const recording = !!session?.recording && session.id === docId;
  const recordMode: Settings.RecordMode = settings?.recordMode ?? 'toggle';
  const entityExtraction = settings?.entityExtraction !== false;
  const selectedDeviceId = settings?.audioDeviceId ?? '';

  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  // Bumped once the microphone is granted. WebKit withholds both `deviceId` and `label` from
  // `enumerateDevices` until a capture permission exists, so the list enumerated at mount is empty
  // and `devicechange` does not fire for a permission grant — leaving the picker permanently blank.
  const [devicesToken, setDevicesToken] = useState(0);
  // Set when the microphone was refused, so the control can say so where a toast cannot reach.
  const [microphoneDenied, setMicrophoneDenied] = useState(false);
  useEffect(() => {
    // Only touch media APIs when the recording controls are actually shown.
    if (!transcriptionAvailable) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const available = await listAudioInputs();
      if (!cancelled) {
        setDevices(available);
      }
    };
    void refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, [transcriptionAvailable, devicesToken]);

  // Recording must not begin until the microphone has actually been granted. Asking here rather than
  // letting the driver open the stream is what makes the refusal legible: the OS prompt is raised by
  // the tap that asked for it, and a denial stops the session instead of leaving a recording UI running
  // against silence. `permissions.query` is not usable for this — WebKit does not support the
  // `microphone` descriptor — so the request itself is the probe, and its stream is released again
  // because the driver opens its own.
  const ensureMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    // Installed from the tap, not at mount: the bridge builds an AudioContext, and WebKit only
    // resumes one inside a user gesture. A no-op wherever native capture is unavailable.
    if (import.meta.env.DEV) {
      await installMicrophoneBridge();
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      // The grant is what makes the device list readable; re-enumerate now that it exists.
      setDevicesToken((token) => token + 1);
      setMicrophoneDenied(false);
      return true;
    } catch {
      // Surfaced on the button rather than as a toast: the mobile layout renders no toast surface, so
      // a refusal there produced no feedback at all — the microphone simply did nothing.
      setMicrophoneDenied(true);
      return false;
    }
  }, [invokePromise]);

  const handleToggle = useCallback(async () => {
    if (!docId) {
      return;
    }
    // Stopping never needs permission; only the start is gated.
    const stopping = recording;
    if (!stopping && !(await ensureMicrophone())) {
      return;
    }
    setSession((current) => (current?.recording && current.id === docId ? null : { id: docId, recording: true }));
  }, [setSession, docId, recording, ensureMicrophone]);

  const handlePressStart = useCallback(async () => {
    if (!docId || !(await ensureMicrophone())) {
      return;
    }
    setSession(() => ({ id: docId, recording: true }));
  }, [setSession, docId, ensureMicrophone]);

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
    (deviceId: string) => {
      // Applied natively where the platform routes capture by session (iOS); elsewhere the id is
      // carried into `getUserMedia` constraints by the recorder.
      void setPreferredAudioInput(deviceId);
      setSettings((current) => ({ ...current, audioDeviceId: deviceId || undefined }));
    },
    [setSettings],
  );

  const recordLabel = microphoneDenied
    ? t('microphone-denied.label')
    : recording
      ? t('stop-recording.label')
      : recordMode === 'hold'
        ? t('hold-to-record.label')
        : t('start-recording.label');

  // Nothing to record into, or no plugin to record with.
  if (!docId || !transcriptionAvailable) {
    return null;
  }

  return (
    <>
      <MicButton
        iconOnly
        variant='ghost'
        disabled={microphoneDenied}
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
  );
};

ChatAudioButton.displayName = 'ChatAudioButton';

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
