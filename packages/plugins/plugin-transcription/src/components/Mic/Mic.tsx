//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { SystemIconButton, useTranslation } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-audio';
import {
  type AudioInputDevice,
  MicSettings,
  installMicrophoneBridge,
  listAudioInputs,
  setPreferredAudioInput,
} from '@dxos/react-ui-transcription';

import { meta } from '#meta';
import { Settings, TranscriptionCapabilities } from '#types';

export type MicProps = {
  /** Attendable id of the target editor; keys the recording session. */
  docId: string;
};

/**
 * Connects the {@link SystemIconButton.Mic} and {@link MicSettings} to the recording session and settings
 * capabilities, and enumerates available audio inputs. Mounted from the toolbar's custom action, so
 * capability hooks resolve — every surface that offers dictation (a document, a chat prompt) gets
 * this same control that way, rather than a copy of it.
 */
export const Mic = ({ docId }: MicProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [session, setSession] = useAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const [settings, setSettings] = useAtomCapabilityState(TranscriptionCapabilities.Settings);

  const recording = !!session?.recording && session.id === docId;

  // Play start/stop cues as this session's recording flag flips (skip the initial mount).
  const soundStart = useSoundEffect('StartRecording');
  const soundStop = useSoundEffect('StopRecording');
  const wasRecording = useRef(recording);
  useEffect(() => {
    if (wasRecording.current === recording) {
      return;
    }
    wasRecording.current = recording;
    void (recording ? soundStart : soundStop).play();
  }, [recording, soundStart, soundStop]);

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
    let cancelled = false;
    const refresh = async () => {
      const available = await listAudioInputs();
      if (!cancelled) {
        setDevices(available);
      }
    };
    void refresh();
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener('devicechange', refresh);
    };
  }, [devicesToken]);

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
      // Surfaced on the button rather than as a toast: the mobile layout renders no toast surface,
      // so a refusal there produced no feedback at all — the microphone simply did nothing.
      setMicrophoneDenied(true);
      return false;
    }
  }, []);

  const handleToggle = useCallback(async () => {
    // Stopping never needs permission; only the start is gated.
    const stopping = recording;
    if (!stopping && !(await ensureMicrophone())) {
      return;
    }
    setSession((current) => (current?.recording && current.id === docId ? null : { id: docId, recording: true }));
  }, [setSession, docId, recording, ensureMicrophone]);

  const handlePressStart = useCallback(async () => {
    if (!(await ensureMicrophone())) {
      return;
    }
    setSession(() => ({ id: docId, recording: true }));
  }, [setSession, docId, ensureMicrophone]);

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

  return (
    <div className='flex items-center'>
      <SystemIconButton.Mic
        iconOnly
        variant='ghost'
        disabled={microphoneDenied}
        label={recordLabel}
        mode={recordMode}
        recording={recording}
        onToggle={handleToggle}
        onPressStart={handlePressStart}
        onPressEnd={handlePressEnd}
        data-testid='transcription.record'
      />
      <MicSettings
        devices={devices}
        entityExtraction={entityExtraction}
        recordMode={recordMode}
        selectedDeviceId={selectedDeviceId}
        onRecordModeChange={handleRecordModeChange}
        onEntityExtractionChange={handleEntityExtractionChange}
        onSelectDevice={handleSelectDevice}
      />
    </div>
  );
};
