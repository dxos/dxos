//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { Provider, Search, SearchOperation } from '../../types';
import { buildUnionFormSchema } from '../../util';

export type SearchPropertiesProps = {
  search: Search.Search;
};

/**
 * Properties companion for a {@link Search}: provider multi-select + criteria form (union of the
 * selected providers' search schemas) + a Run control. Surfaced in the object's Properties panel
 * (the masonry results live in the article).
 */
export const SearchProperties = ({ search }: SearchPropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const database = Obj.getDatabase(search);

  // Reactive query of every Provider in the space — the multi-select toggles
  // which of these are linked into `search.providers`.
  const allProviders = useQuery(database, Filter.type(Provider.Provider));

  // Match by object id (the DXN tail). DXN URIs separate the id with `/` — `echo:/<id>` for a
  // local ref vs `echo://<space>/<id>` for a space-qualified one — so split on `/`, not `:`.
  const refId = (ref: { uri: string }) => ref.uri.split('/').pop() ?? '';
  const selectedIds = useMemo(() => new Set(search.providers.map(refId)), [search.providers]);

  const selectedProviders = useMemo(
    () => allProviders.filter((provider) => selectedIds.has(provider.id)),
    [allProviders, selectedIds],
  );

  const handleToggleProvider = useCallback(
    (provider: Provider.Provider) => {
      Obj.update(search, (search) => {
        const exists = search.providers.some((ref) => refId(ref) === provider.id);
        search.providers = exists
          ? search.providers.filter((ref) => refId(ref) !== provider.id)
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

  // Run progress is ephemeral UI state, not a persisted property on the Search.
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(() => {
    setRunning(true);
    // Pass the spaceId so the invoker resolves Database.Service for the operation's spawn
    // environment (a bare Ref carries no space, so process-affinity services can't resolve).
    void invokePromise(SearchOperation.RunSearch, { search: Ref.make(search) }, { spaceId: database?.spaceId })
      .catch((err) => log.catch(err))
      .finally(() => setRunning(false));
  }, [invokePromise, search, database]);

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col gap-1'>
        <span className='text-sm text-description'>{t('providers.label')}</span>
        {allProviders.length === 0 ? (
          <span className='text-sm text-subdued'>{t('no-providers.message')}</span>
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

      {/* TODO(burdon): Fix indentation; is this the right way to extend properties? */}
      {selectedProviders.length > 0 && (
        // Re-key the form on the set of selected providers so the merged schema
        // re-initialises when the provider selection changes.
        <Form.Root
          key={selectedProviders.map((provider) => provider.id).join()}
          schema={schema}
          defaultValues={{ ...search.criteria }}
          autoSave
          onSave={handleSave}
        >
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Root>
      )}

      <IconButton
        icon='ph--shopping-cart--regular'
        label={running ? t('running.label') : t('run.label')}
        disabled={selectedProviders.length === 0 || running}
        onClick={handleRun}
      />
    </div>
  );
};
