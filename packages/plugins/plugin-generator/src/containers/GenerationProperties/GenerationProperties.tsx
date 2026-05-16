//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { Input, Select, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { HeyGenProvider, type GenerationOption, type GenerationProvider } from '#services';
import { type Generation, GeneratorCapabilities } from '#types';

export type GenerationPropertiesProps = {
  subject: Generation.Generation;
};

type Options = {
  avatars: GenerationOption[];
  voices: GenerationOption[];
};

type Status = 'idle' | 'loading' | 'ready' | 'error';

const EMPTY_OPTIONS: Options = { avatars: [], voices: [] };

// Hard cap on rendered options so providers that return thousands of voices
// (HeyGen ships ~1500) don't lock up the browser inside a non-virtualised
// `Select.Viewport`. Increase only after adding virtualisation or a search box.
const MAX_OPTIONS = 200;

/**
 * Object properties surface for `Generation`. Renders custom Select controls
 * for `avatarId` and `voiceId` populated by `provider.listAvatars()` /
 * `listVoices()`. The base form continues to render the remaining schema
 * fields (the two hidden fields are marked `FormInputAnnotation.set(false)`).
 */
export const GenerationProperties = ({ subject }: GenerationPropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const [generation] = useObject(subject);
  const settings = useAtomCapability(GeneratorCapabilities.Settings);
  const apiKey = settings?.apiKey;
  const provider = useGenerationProvider();
  const [{ avatars, voices }, setOptions] = useState<Options>(EMPTY_OPTIONS);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!apiKey) {
      setOptions(EMPTY_OPTIONS);
      setStatus('idle');
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    setError(undefined);
    Promise.all([
      provider.listAvatars({ apiKey, signal: controller.signal }),
      provider.listVoices({ apiKey, signal: controller.signal }),
    ])
      .then(([fetchedAvatars, fetchedVoices]) => {
        if (controller.signal.aborted) {
          return;
        }
        setOptions({ avatars: fetchedAvatars, voices: fetchedVoices });
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        log.catch(err);
        setError(err instanceof Error ? err.message : t('generation-failed.message'));
        setStatus('error');
      });
    return () => controller.abort();
  }, [apiKey, provider, t]);

  const handleAvatarChange = useCallback(
    (value: string) => {
      Obj.update(subject, (subject) => {
        subject.avatarId = value || undefined;
      });
    },
    [subject],
  );

  const handleVoiceChange = useCallback(
    (value: string) => {
      Obj.update(subject, (subject) => {
        subject.voiceId = value || undefined;
      });
    },
    [subject],
  );

  const placeholder = !apiKey
    ? t('properties.no-api-key.label')
    : status === 'loading'
      ? t('properties.loading.label')
      : status === 'error'
        ? (error ?? t('generation-failed.message'))
        : undefined;

  // TODO(burdon): Extend Form to provide Form.Group.
  return (
    <>
      <PropertySelect
        label={t('avatar.label')}
        value={generation.avatarId}
        options={avatars}
        placeholder={placeholder ?? t('properties.select-avatar.placeholder')}
        disabled={status !== 'ready' || (avatars.length === 0 && !generation.avatarId)}
        onValueChange={handleAvatarChange}
      />
      <PropertySelect
        label={t('voice.label')}
        value={generation.voiceId}
        options={voices}
        placeholder={placeholder ?? t('properties.select-voice.placeholder')}
        disabled={status !== 'ready' || (voices.length === 0 && !generation.voiceId)}
        onValueChange={handleVoiceChange}
      />
    </>
  );
};

export default GenerationProperties;

type PropertySelectProps = {
  label: string;
  value?: string;
  options: GenerationOption[];
  placeholder: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
};

const PropertySelect = ({ label, value, options, placeholder, disabled, onValueChange }: PropertySelectProps) => {
  // Include the current value as an option even if it isn't in the listed set so
  // a previously-set id remains visible in the trigger; the user can still pick a different one.
  // Cap the total at MAX_OPTIONS so a multi-thousand entry list doesn't lock the browser.
  const resolved = useMemo(() => {
    const capped = options.slice(0, MAX_OPTIONS);
    if (!value || capped.some((option) => option.id === value)) {
      return capped;
    }
    return [{ id: value, name: value }, ...capped];
  }, [value, options]);

  return (
    <Input.Root>
      <Input.Label>{label}</Input.Label>
      <Select.Root disabled={disabled} value={value} onValueChange={onValueChange}>
        <Select.TriggerButton placeholder={placeholder} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {resolved.map((option) => (
                <Select.Option key={option.id} value={option.id}>
                  {option.name}
                </Select.Option>
              ))}
            </Select.Viewport>
            <Select.Arrow />
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Input.Root>
  );
};

const useGenerationProvider = (): GenerationProvider => useMemo(() => new HeyGenProvider(), []);
