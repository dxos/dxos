//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import React, { useMemo } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { AccessToken } from '@dxos/link';
import { ComboboxField, type FormFieldMap, type FormFieldRendererProps, FormFieldRow } from '@dxos/react-ui-form';
import { type OptionsLookup } from '@dxos/react-ui-form/annotations';

import { type GenerationService } from '#types';

import { loadProviderOptions } from '../../hooks/index.ts';

export type ProviderOptionsFieldProps = FormFieldRendererProps & {
  provider: GenerationService.GenerationService;
  field: string;
};

/**
 * A request field whose values the provider lists (`GenerationService.fieldOptions`): a combobox over
 * the loaded catalogue, so a value outside it can still be typed. The credential is the
 * Connector-managed `AccessToken` for the provider's `source` in the active space; without one the
 * loader runs keyless, which a keyed provider answers with an error the field shows as empty.
 */
export const ProviderOptionsField = ({ provider, field, ...props }: ProviderOptionsFieldProps) => {
  const space = useActiveSpace();
  const [token] = useQuery(space?.db, Filter.type(AccessToken.AccessToken, { source: provider.source }));
  const apiKey = token?.token;

  const lookup = useMemo<OptionsLookup>(
    () => ({
      // Depends on its own field so the combobox feeds the query; the list is filtered by the field.
      deps: [field],
      combobox: true,
      eager: true,
      load: () =>
        Effect.promise(() =>
          loadProviderOptions(provider, field, { apiKey: apiKey ? Redacted.make(apiKey) : undefined }),
        ),
    }),
    [provider, field, apiKey],
  );

  // A renderer the form supplies owns its row (label, description, error), unlike a dispatched control.
  return (
    <FormFieldRow
      label={props.label}
      description={props.description}
      error={props.getStatus().error}
      required={props.required}
      readonly={props.readonly}
      presentation={props.presentation}
    >
      <ComboboxField {...props} lookup={lookup} />
    </FormFieldRow>
  );
};

ProviderOptionsField.displayName = 'ProviderOptionsField';

/** Renderers for every field the provider lists options for; the provider's own `fieldMap` wins. */
export const providerFieldMap = (provider: GenerationService.GenerationService): FormFieldMap => {
  const entries = Object.keys(provider.fieldOptions ?? {}).map((field) => [
    field,
    (props: FormFieldRendererProps) => <ProviderOptionsField {...props} provider={provider} field={field} />,
  ]);
  return { ...Object.fromEntries(entries), ...provider.fieldMap };
};
