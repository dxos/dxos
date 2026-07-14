//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { AccessToken } from '@dxos/cursor';
import { Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { type FormFieldMap, type FormFieldRendererProps, SelectField } from '@dxos/react-ui-form';

import { HEYGEN_SOURCE } from '../../constants';
import { type GenerationOption, makeHeyGenProvider } from '../../services';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Fetches avatar or voice options from the HeyGen API using the Connector-managed credential
 * (`AccessToken` keyed by `source: heygen.com`), scoped to the active space.
 */
const useHeyGenOptions = (
  kind: 'avatars' | 'voices',
): { options: GenerationOption[]; status: Status; hasKey: boolean } => {
  const space = useActiveSpace();
  const [token] = useQuery(space?.db, Filter.type(AccessToken.AccessToken, { source: HEYGEN_SOURCE }));
  const apiKey = token?.token;
  const provider = useMemo(() => makeHeyGenProvider(), []);
  const [options, setOptions] = useState<GenerationOption[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (!apiKey) {
      setOptions([]);
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    const request =
      kind === 'avatars'
        ? provider.listAvatars({ apiKey, signal: controller.signal })
        : provider.listVoices({ apiKey, signal: controller.signal });
    request
      .then((fetched) => {
        if (!controller.signal.aborted) {
          setOptions(fetched);
          setStatus('ready');
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          log.catch(err);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [apiKey, provider, kind]);

  return { options, status, hasKey: !!apiKey };
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

const placeholderFor = (noun: string, hasKey: boolean, status: Status): string =>
  !hasKey
    ? 'Connect HeyGen to load options.'
    : status === 'loading'
      ? 'Loading…'
      : status === 'error'
        ? 'Failed to load options.'
        : `Select ${noun}`;

const OptionField = ({
  kind,
  noun,
  ...props
}: FormFieldRendererProps & { kind: 'avatars' | 'voices'; noun: string }) => {
  const { options, status, hasKey } = useHeyGenOptions(kind);
  const value = props.getValue();
  const current = typeof value === 'string' ? value : undefined;
  return (
    <SelectField
      {...props}
      options={makeOptions(options, current)}
      placeholder={placeholderFor(noun, hasKey, status)}
      readonly={props.readonly || status !== 'ready' || (options.length === 0 && !current)}
    />
  );
};

/**
 * `fieldMap` for HeyGen's request-config form: renders `avatarId` / `voiceId` as {@link SelectField}s
 * populated from the account's avatars/voices. Merged into the studio's schema-driven form by the
 * article via `GenerationService.fieldMap`.
 */
export const heyGenFieldMap: FormFieldMap = {
  avatarId: (props) => <OptionField {...props} kind='avatars' noun='an avatar' />,
  voiceId: (props) => <OptionField {...props} kind='voices' noun='a voice' />,
};
