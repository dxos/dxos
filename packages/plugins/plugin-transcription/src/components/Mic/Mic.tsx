//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { MicButton, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Settings, TranscriptionCapabilities } from '#types';

import { type AudioInputDevice, MicSettings } from './MicSettings';

export type MicProps = {
  /** Attendable id of the target editor; keys the recording session. */
  docId: string;
};

/**
 * Connects the {@link MicButton} and {@link MicSettings} to the recording session and settings
 * capabilities, and enumerates available audio inputs. Mounted from the toolbar's custom action, so
 * capability hooks resolve.
 */
export const Mic = ({ docId }: MicProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [session, setSession] = useAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const [settings, setSettings] = useAtomCapabilityState(TranscriptionCapabilities.Settings);

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
    setSession((current) => (current?.recording && current.id === docId ? null : { id: docId, recording: true }));
  }, [setSession, docId]);

  const handlePressStart = useCallback(() => {
    setSession(() => ({ id: docId, recording: true }));
  }, [setSession, docId]);

  const handlePressEnd = useCallback(() => {
    // Only stop our own session; a stray release must not clear another editor's recording.
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
    <div className='flex items-center'>
      <MicButton
        iconOnly
        variant='ghost'
        label={recordLabel}
        recording={recording}
        mode={recordMode}
        onToggle={handleToggle}
        onPressStart={handlePressStart}
        onPressEnd={handlePressEnd}
        data-testid='transcription.record'
      />
      <MicSettings
        recordMode={recordMode}
        entityExtraction={entityExtraction}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onRecordModeChange={handleRecordModeChange}
        onEntityExtractionChange={handleEntityExtractionChange}
        onSelectDevice={handleSelectDevice}
      />
    </div>
  );
};
