//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';

import { Connector, type ConnectorEntry } from '../../types/ConnectorSpec.ts';

export type CreateConnectionPanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override, primarily for stories and tests. Defaults to the `Connector` capability. */
  connectors?: ConnectorEntry[];
};

/**
 * Single-dialog connection creation: pick a service, then fill that connector's credential fields
 * without an intervening dialog.
 *
 * Replaces a two-step flow whose first dialog collected only `connectorId` and whose second was
 * opened by the coordinator. Merging them costs nothing for OAuth connectors — they declare no
 * `credentialForm`, so there is nothing to fill and pressing Save starts the OAuth flow directly.
 */
export const CreateConnectionPanel = ({ onCreateObject, connectors: connectorsProp }: CreateConnectionPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const capabilityConnectors = useCapabilities(Connector).flat();
  const connectors = connectorsProp ?? capabilityConnectors;
  const [connectorId, setConnectorId] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const sorted = useMemo(
    () =>
      [...connectors].sort((left, right) =>
        (left.label ?? left.id).localeCompare(right.label ?? right.id, undefined, { sensitivity: 'base' }),
      ),
    [connectors],
  );
  const { results, handleSearch } = useSearchListResults({
    items: sorted,
    extract: (connector) => connector.label ?? connector.id,
  });

  const connector = useMemo(() => connectors.find((entry) => entry.id === connectorId), [connectors, connectorId]);
  const credentialForm = connector?.credentialForm;

  const submit = useCallback(
    (values?: Record<string, any>) => {
      if (!connector) {
        return;
      }
      setError(undefined);
      setPending(true);

      // Validation runs here rather than after the panel closes, so its message has somewhere to go.
      const validate = credentialForm?.onValidate
        ? credentialForm.onValidate({ values: values as never, connector })
        : Effect.void;

      void EffectEx.runPromise(
        validate.pipe(
          Effect.andThen(Effect.promise(async () => onCreateObject({ connectorId: connector.id, values }))),
          Effect.catch((failure) =>
            Effect.sync(() => {
              log.catch(failure);
              setError(String(failure instanceof Error ? failure.message : failure));
              setPending(false);
            }),
          ),
        ),
      );
    },
    [connector, credentialForm, onCreateObject],
  );

  if (!connector) {
    return (
      <SearchList.Root onSearch={handleSearch}>
        <SearchList.Input
          classNames='mb-form-gap'
          autoFocus
          data-testid='create-connection-panel.service-input'
          placeholder={t('create-connection.service.placeholder')}
        />
        <SearchList.Viewport>
          {results.map((entry) => (
            <SearchList.Item
              key={entry.id}
              value={entry.id}
              label={entry.label ?? entry.id}
              icon='ph--plugs-connected--regular'
              onSelect={() => setConnectorId(entry.id)}
            />
          ))}
        </SearchList.Viewport>
      </SearchList.Root>
    );
  }

  // No `Column` wrapper here: the create-object dialog already establishes one, and nesting a
  // second inset the whole form inside it.
  return (
    <>
      {credentialForm ? (
        <Form.Root
          autoFocus
          schema={credentialForm.schema}
          defaultValues={credentialForm.defaultValues ?? {}}
          onSave={(values: any) => submit(values)}
        >
          <Form.Content>
            <Form.FieldSet />
            <Form.Submit disabled={pending ? true : undefined} />
          </Form.Content>
        </Form.Root>
      ) : (
        // No credential form: nothing further is needed up front, so Save starts the OAuth flow.
        <Button
          variant='primary'
          disabled={pending}
          onClick={() => submit(undefined)}
          data-testid='create-connection-panel.connect'
        >
          {t('connect-service.label', { service: connector.label ?? connector.id })}
        </Button>
      )}
      {/* `role='alert'` because this appears after an async failure, which a screen reader would
          otherwise not announce. */}
      {error && (
        <span role='alert' className='text-sm text-error-text'>
          {error}
        </span>
      )}
    </>
  );
};
