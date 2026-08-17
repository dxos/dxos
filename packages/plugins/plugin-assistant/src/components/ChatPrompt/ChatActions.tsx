//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { useOperationInvoker, useOptionalAtomCapabilityState, useOptionalCapabilities } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Settings from '@dxos/plugin-transcription/Settings';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import { DropdownMenu, Icon, IconButton, MicButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type ChatEvent } from '../Chat/events';

/** Shared so a repeated refusal updates the toast in place rather than stacking copies. */
const MICROPHONE_TOAST_ID = 'assistant.microphone-denied';

type AudioInputDevice = {
  deviceId: string;
  label: string;
};

export type ChatActionsProps = ThemedClassName<
  PropsWithChildren<{
    docId?: string;
    microphone?: boolean;
    processing?: boolean;
    debug?: boolean;
    onEvent?: (event: ChatEvent) => void;
  }>
>;

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
  const { invokePromise } = useOperationInvoker();
  const [settings, setSettings] = useOptionalAtomCapabilityState(TranscriptionCapabilities.Settings);

  const recording = !!session?.recording && session.id === docId;
  const recordMode: Settings.RecordMode = settings?.recordMode ?? 'toggle';
  const entityExtraction = settings?.entityExtraction !== false;
  const selectedDeviceId = settings?.audioDeviceId ?? '';

  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  useEffect(() => {
    // Only touch media APIs when the recording controls are actually shown.
    if (!microphone || !transcriptionAvailable || !navigator.mediaDevices?.enumerateDevices) {
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
  }, [microphone, transcriptionAvailable]);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      return true;
    } catch {
      void invokePromise(LayoutOperation.AddToast, {
        id: MICROPHONE_TOAST_ID,
        icon: 'ph--microphone-slash--regular',
        title: ['microphone-denied.toast.title', { ns: meta.profile.key }],
        description: ['microphone-denied.toast.description', { ns: meta.profile.key }],
      });
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
        disabled={!processing} // TODO(dmaretskyi): Set processing state correctly on rehydrated agents.
        variant='ghost'
        classNames={processing && 'text-error-text'}
        icon={processing ? 'ph--square--duotone' : 'ph--square--regular'}
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
