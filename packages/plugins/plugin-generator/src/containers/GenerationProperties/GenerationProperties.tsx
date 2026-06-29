//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, SelectField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type GenerationOption, type GenerationProvider, HeyGenProvider } from '#services';
import { type Generation, GeneratorCapabilities } from '#types';

type Status = 'idle' | 'loading' | 'ready' | 'error';

type Options = { avatars: GenerationOption[]; voices: GenerationOption[] };

const EMPTY_OPTIONS: Options = { avatars: [], voices: [] };

/**
 * Sub-schema rendered by our object-properties surface. The corresponding
 * fields on `Generation` carry `FormInputAnnotation.set(false)` so the base
 * gear-pane form skips them and we own the rendering here, using a `fieldMap`
 * that swaps in `SelectField` controls populated by the active `GenerationProvider`.
 */
const PropertiesSchema = Schema.Struct({
  avatarId: Schema.optional(Schema.String.annotations({ title: 'Avatar' })),
  voiceId: Schema.optional(Schema.String.annotations({ title: 'Voice' })),
});

type PropertiesValues = Schema.Schema.Type<typeof PropertiesSchema>;

export type GenerationPropertiesProps = {
  subject: Generation.Generation;
};

export const GenerationProperties = ({ subject }: GenerationPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
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

  const defaultValues = useMemo<PropertiesValues>(
    () => ({ avatarId: generation.avatarId, voiceId: generation.voiceId }),
    [generation.avatarId, generation.voiceId],
  );

  const handleValuesChanged = useCallback(
    (values: PropertiesValues) => {
      Obj.update(subject, (subject) => {
        subject.avatarId = values.avatarId || undefined;
        subject.voiceId = values.voiceId || undefined;
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

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      avatarId: (props) => (
        <SelectField
          {...props}
          options={makeOptions(avatars, generation.avatarId)}
          placeholder={placeholder ?? t('properties.select-avatar.placeholder')}
          readonly={status !== 'ready' || (avatars.length === 0 && !generation.avatarId)}
        />
      ),
      voiceId: (props) => (
        <SelectField
          {...props}
          options={makeOptions(voices, generation.voiceId)}
          placeholder={placeholder ?? t('properties.select-voice.placeholder')}
          readonly={status !== 'ready' || (voices.length === 0 && !generation.voiceId)}
        />
      ),
    }),
    [avatars, voices, placeholder, status, generation.avatarId, generation.voiceId, t],
  );

  return (
    <Form.Root
      schema={PropertiesSchema}
      defaultValues={defaultValues}
      fieldMap={fieldMap}
      onValuesChanged={handleValuesChanged}
    >
      <Form.FieldSet />
    </Form.Root>
  );
};

/**
 * Build option entries for a `SelectField`. Includes the current value as a
 * synthetic option when it isn't in the fetched set so a previously-set id
 * remains visible in the trigger and can still be replaced.
 */
const makeOptions = (options: GenerationOption[], current?: string): Array<{ value: string; label: string }> => {
  const base = options.map((option) => ({ value: option.id, label: option.name }));
  if (!current || base.some((option) => option.value === current)) {
    return base;
  }
  return [{ value: current, label: current }, ...base];
};

// TODO(burdon): Move to capability.
const useGenerationProvider = (): GenerationProvider => useMemo(() => new HeyGenProvider(), []);
