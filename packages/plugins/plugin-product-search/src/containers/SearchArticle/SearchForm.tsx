//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Input } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { Provider, Search, SearchOperation } from '../../types';
import { buildUnionFormSchema } from '../../util';

export type SearchFormProps = {
  search: Search.Search;
};

/**
 * Left pane: provider multi-select + criteria form (union of the selected
 * providers' search schemas) + a Run control.
 */
export const SearchForm = ({ search }: SearchFormProps) => {
  const { invokePromise } = useOperationInvoker();
  const database = Obj.getDatabase(search);

  // Reactive query of every Provider in the space — the multi-select toggles
  // which of these are linked into `search.providers`.
  const allProviders = useQuery(database, Filter.type(Provider.Provider));

  // Bare object ids of the providers currently linked to the search.
  const selectedIds = useMemo(
    () => new Set(search.providers.map((ref) => ref.uri.split(':').pop() ?? '')),
    [search.providers],
  );

  const selectedProviders = useMemo(
    () => allProviders.filter((provider) => selectedIds.has(provider.id)),
    [allProviders, selectedIds],
  );

  const handleToggleProvider = useCallback(
    (provider: Provider.Provider) => {
      Obj.update(search, (search) => {
        const exists = search.providers.some((ref) => (ref.uri.split(':').pop() ?? '') === provider.id);
        search.providers = exists
          ? search.providers.filter((ref) => (ref.uri.split(':').pop() ?? '') !== provider.id)
          : [...search.providers, Ref.make(provider)];
      });
    },
    [search],
  );

  // Effect Schema for the form, merged from the selected providers' search schemas.
  const schema = useMemo(
    () => buildUnionFormSchema(selectedProviders.map((provider) => provider.searchSchema)),
    [selectedProviders],
  );

  const handleSave = useCallback(
    (values: Record<string, unknown>) => {
      Obj.update(search, (search) => {
        search.criteria = { ...values };
      });
    },
    [search],
  );

  const handleRun = useCallback(() => {
    void invokePromise(SearchOperation.RunSearch, { search: Ref.make(search) }).catch((err) => log.catch(err));
  }, [invokePromise, search]);

  return (
    <div className='flex flex-col gap-3 p-3 overflow-y-auto'>
      <div className='flex flex-col gap-1'>
        <span className='text-sm text-description'>Providers</span>
        {allProviders.length === 0 ? (
          <span className='text-sm text-subdued'>No providers in this space.</span>
        ) : (
          allProviders.map((provider) => (
            <Input.Root key={provider.id}>
              <div className='flex items-center gap-2'>
                <Input.Checkbox
                  checked={selectedIds.has(provider.id)}
                  onCheckedChange={() => handleToggleProvider(provider)}
                />
                <Input.Label>{provider.name}</Input.Label>
              </div>
            </Input.Root>
          ))
        )}
      </div>

      {selectedProviders.length > 0 && (
        // Re-key the form on the set of selected providers so the merged schema
        // re-initialises when the provider selection changes.
        <Form.Root
          key={selectedProviders.map((provider) => provider.id).join()}
          schema={schema}
          values={{ ...search.criteria }}
          autoSave
          onSave={handleSave}
        >
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Root>
      )}

      <IconButton
        icon='ph--magnifying-glass--regular'
        label='Run'
        disabled={selectedProviders.length === 0}
        onClick={handleRun}
      />
    </div>
  );
};
