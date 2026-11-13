//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Select from '@dxos/react-ui/Select';

import { LevelMeter } from '#components';
import { meta } from '#meta';
import { RecorderSettings as Settings } from '#types';

import { type InputDevice, PREFERRED_MICROPHONE, pickDevice } from '../../audio/devices.ts';
import { useInputDevices, useLevel, useMicrophoneTest } from '../../hooks/index.ts';

export type RecorderSettingsProps = AppSurface.SettingsData;

/** Microphone and video source for takes, with a microphone test on the level meter. */
export const RecorderSettings = ({ subject }: RecorderSettingsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { settings, updateSettings } = Hooks.useSettingsState<Settings.Settings>(subject.atom);
  const microphones = useInputDevices('audioinput');
  const cameras = useInputDevices('videoinput');
  const microphone = pickDevice(microphones.devices, settings.audioInput, PREFERRED_MICROPHONE);
  // Labels appear only once the page holds a grant, so the lists are read again after the test opens the mic.
  const test = useMicrophoneTest(microphone, microphones.refresh);
  const level = useLevel(test.analyser);

  const handleChange = useCallback(
    (key: 'audioInput' | 'videoInput', value: string) => updateSettings((current) => ({ ...current, [key]: value })),
    [updateSettings],
  );

  return (
    <Form.Root
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope.Root prefix={meta.profile.key} />}
          >
            <DeviceField
              testId='recorder.settings.microphone'
              label={t('settings.microphone.label')}
              description={t('settings.microphone.description')}
              placeholder={t('settings.no-devices.placeholder')}
              devices={microphones.devices}
              value={microphone}
              onChange={(value) => handleChange('audioInput', value)}
            />
            <Form.Field label={t('settings.test-microphone.label')} description={test.error ?? test.label}>
              <div className='flex items-center gap-3'>
                <Button.Root
                  data-testid='recorder.settings.test'
                  icon={test.analyser ? 'ph--stop--regular' : 'ph--microphone--regular'}
                  onClick={() => (test.analyser ? test.stop() : void test.start())}
                >
                  {t(test.analyser ? 'stop-test.label' : 'test-microphone.label')}
                </Button.Root>
                <LevelMeter
                  peakDb={level?.peakDb}
                  holdDb={level?.holdDb}
                  rmsDb={level?.rmsDb}
                  silent={level?.silent}
                  clip={level?.clip}
                />
              </div>
            </Form.Field>
            <Form.Fields filter={(properties) => properties.filter((property) => property.name === 'videoSource')} />
            {settings.videoSource === 'camera' && (
              <DeviceField
                testId='recorder.settings.camera'
                label={t('settings.camera.label')}
                description={t('settings.camera.description')}
                placeholder={t('settings.no-devices.placeholder')}
                devices={cameras.devices}
                value={pickDevice(cameras.devices, settings.videoInput)}
                onChange={(value) => handleChange('videoInput', value)}
              />
            )}
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

RecorderSettings.displayName = 'RecorderSettings';

type DeviceFieldProps = {
  testId: string;
  label: string;
  description: string;
  placeholder: string;
  devices: InputDevice[];
  value?: string;
  onChange: (value: string) => void;
};

/** An input device picker; a device the browser has not labelled yet shows by its id. */
const DeviceField = ({ testId, label, description, placeholder, devices, value, onChange }: DeviceFieldProps) => {
  const items = devices.map((device) => ({
    value: device.deviceId,
    label: device.label || device.deviceId.slice(0, 8),
  }));
  return (
    <Form.Field label={label} description={description}>
      <Select.Root value={value ? [value] : []} onValueChange={({ value: [next] }) => onChange(next)} items={items}>
        <Select.Trigger data-testid={testId} placeholder={placeholder} />
        <Select.Content>
          {items.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
    </Form.Field>
  );
};
