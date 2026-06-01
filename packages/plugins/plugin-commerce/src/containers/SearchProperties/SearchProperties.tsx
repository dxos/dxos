//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { Provider, Search, SearchOperation } from '../../types';
import { buildUnionFormSchema } from '../../util';

export type SearchPropertiesProps = {
  search: Search.Search;
};

/**
 * Properties companion for a {@link Search}: a criteria form (the union of the selected providers'
 * search schemas) + a Run control. Surfaced in the object's Properties panel, below the generic
 * object form — which already edits `search.providers` via its ref-array picker, so no provider
 * selector is duplicated here. The masonry results live in the article.
 */
export const SearchProperties = ({ search }: SearchPropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const database = Obj.getDatabase(search);

  // Reactive query of every Provider in the space — used to resolve the Provider objects (and their
  // `searchSchema`) for the refs currently linked into `search.providers` by the generic form.
  const allProviders = useQuery(database, Filter.type(Provider.Provider));

  // Match by object id (the DXN tail). DXN URIs separate the id with `/` — `echo:/<id>` for a
  // local ref vs `echo://<space>/<id>` for a space-qualified one — so split on `/`, not `:`.
  const refId = (ref: { uri: string }) => ref.uri.split('/').pop() ?? '';
  const selectedIds = useMemo(() => new Set(search.providers.map(refId)), [search.providers]);

  const selectedProviders = useMemo(
    () => allProviders.filter((provider) => selectedIds.has(provider.id)),
    [allProviders, selectedIds],
  );

  // Effect Schema for the form, merged from the selected providers' search schemas.
  const schema = useMemo(
    () => buildUnionFormSchema(selectedProviders.map((provider) => provider.searchSchema)),
    [selectedProviders],
  );

  const handleSave = useCallback(
    (values: Record<string, unknown>) => {
      Obj.update(search, (search) => {
        search.params = { ...values };
      });
    },
    [search],
  );

  // Run progress is ephemeral UI state, not a persisted property on the Search.
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(() => {
    // The operation's process-affinity Database.Service can only be resolved with a real spaceId
    // (a bare Ref carries no space), so skip the run if the search isn't attached to a space yet.
    if (!database) {
      return;
    }
    setRunning(true);
    void invokePromise(SearchOperation.RunSearch, { search: Ref.make(search) }, { spaceId: database.spaceId })
      .catch((err) => log.catch(err))
      .finally(() => setRunning(false));
  }, [invokePromise, search, database]);

  return (
    <div className='flex flex-col'>
      {/* TODO(burdon): Fix indentation; is this the right way to extend properties? */}
      {selectedProviders.length > 0 && (
        // Re-key the form on the set of selected providers so the merged schema
        // re-initialises when the provider selection changes.
        <Form.Root
          key={selectedProviders.map((provider) => provider.id).join()}
          schema={schema}
          defaultValues={{ ...search.params }}
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
