//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { Form, type FormFieldMap, SelectField } from '@dxos/react-ui-form';
import { AccessToken } from '@dxos/types';

import { HEYGEN_SOURCE } from '../../constants';
import { type GenerationOption, makeHeyGenProvider } from '../../services';

type Status = 'idle' | 'loading' | 'ready' | 'error';

type Options = { avatars: GenerationOption[]; voices: GenerationOption[] };

const EMPTY_OPTIONS: Options = { avatars: [], voices: [] };

export type HeyGenGenerateFormProps = {
  /** The provider's requestSchema ({ avatarId?, voiceId? }) supplied by the studio GenerateForm surface. */
  schema: Schema.Schema.AnyNoContext;
  /** Current config values on the artifact. */
  value: Record<string, unknown>;
  /** Persist the updated config (writes Artifact.config). Omit when `readonly`. */
  onChange?: (value: Record<string, unknown>) => void;
  /** Render the values without editing (e.g. a produced variant's recorded params). */
  readonly?: boolean;
};

/**
 * HeyGen-specific request form: overrides studio's default schema-driven GenerateForm for
 * `kind: 'video'`. Renders the `avatarId` / `voiceId` fields as {@link SelectField}s populated from
 * the account's avatars/voices (fetched via the HeyGen API using the Connector-managed credential,
 * keyed by `source: heygen.com`). Ported from the former plugin-generator `GenerationProperties`.
 */
export const HeyGenGenerateForm = ({ schema, value, onChange, readonly }: HeyGenGenerateFormProps) => {
  const space = useActiveSpace();
  const [token] = useQuery(space?.db, Filter.type(AccessToken.AccessToken, { source: HEYGEN_SOURCE }));
  const apiKey = token?.token;
  const provider = useMemo(() => makeHeyGenProvider(), []);
  const [{ avatars, voices }, setOptions] = useState<Options>(EMPTY_OPTIONS);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>();

  const currentAvatar = typeof value.avatarId === 'string' ? value.avatarId : undefined;
  const currentVoice = typeof value.voiceId === 'string' ? value.voiceId : undefined;

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
        setError(err instanceof Error ? err.message : 'Failed to load HeyGen avatars/voices.');
        setStatus('error');
      });

    return () => controller.abort();
  }, [apiKey, provider]);

  const handleValuesChanged = useCallback(
    (values: Record<string, unknown>) => {
      onChange?.({
        ...value,
        ...values,
        // Normalize the picker fields (empty string → undefined); preserve any other schema fields.
        avatarId: values.avatarId || undefined,
        voiceId: values.voiceId || undefined,
      });
    },
    [onChange, value],
  );

  const placeholder = !apiKey
    ? 'Connect HeyGen to load avatars/voices.'
    : status === 'loading'
      ? 'Loading…'
      : status === 'error'
        ? (error ?? 'Failed to load HeyGen avatars/voices.')
        : undefined;

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      avatarId: (props) => (
        <SelectField
          {...props}
          options={makeOptions(avatars, currentAvatar)}
          placeholder={placeholder ?? 'Select an avatar'}
          readonly={readonly || status !== 'ready' || (avatars.length === 0 && !currentAvatar)}
        />
      ),
      voiceId: (props) => (
        <SelectField
          {...props}
          options={makeOptions(voices, currentVoice)}
          placeholder={placeholder ?? 'Select a voice'}
          readonly={readonly || status !== 'ready' || (voices.length === 0 && !currentVoice)}
        />
      ),
    }),
    [avatars, voices, placeholder, status, currentAvatar, currentVoice, readonly],
  );

  return (
    <Form.Root
      schema={schema}
      defaultValues={value}
      fieldMap={fieldMap}
      readonly={readonly}
      onValuesChanged={readonly ? undefined : handleValuesChanged}
    >
      <Form.Content>
        <Form.FieldSet />
      </Form.Content>
    </Form.Root>
  );
};

/**
 * Build option entries for a {@link SelectField}. Includes the current value as a synthetic option
 * when it isn't in the fetched set so a previously-set id remains visible and replaceable.
 */
const makeOptions = (options: GenerationOption[], current?: string): Array<{ value: string; label: string }> => {
  const base = options.map((option) => ({ value: option.id, label: option.name }));
  if (!current || base.some((option) => option.value === current)) {
    return base;
  }
  return [{ value: current, label: current }, ...base];
};

HeyGenGenerateForm.displayName = 'HeyGenGenerateForm';
