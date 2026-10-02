//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { Form } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

import { Connector, type ConnectorEntry } from '../../types/ConnectorSpec.ts';

const ConnectorSelection = Schema.Struct({ connectorId: Schema.String });

type ConnectorSelection = Schema.Schema.Type<typeof ConnectorSelection>;

/** The connect stage of an OAuth connector collects nothing; its form exists for the Cancel/Connect row. */
const NoValues = Schema.Struct({});

export type CreateConnectionPanelProps = SpaceCapabilities.CreateObjectCustomPanelProps & {
  /** Optional override, primarily for stories and tests. Defaults to the `Connector` capability. */
  connectors?: ConnectorEntry[];
};

/**
 * Single-dialog connection creation: pick a service (picking selects; Continue advances and Cancel
 * abandons the create), then fill that connector's credential fields without an intervening dialog.
 *
 * A connector with no `credentialForm` starts its OAuth flow on Continue; the connect button still
 * renders behind the popup, as the retry affordance when the flow fails. Cancel on either later stage
 * returns to the picker.
 */
export const CreateConnectionPanel = ({
  onCreateObject,
  onCancel,
  connectors: connectorsProp,
}: CreateConnectionPanelProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const capabilityConnectors = AppHooks.useCapabilities(Connector).flat();
  const connectors = connectorsProp ?? capabilityConnectors;
  const [connectorId, setConnectorId] = useState<string>();
  const [error, setError] = useState<string>();
  // The OAuth start Continue fires belongs to no form, so its saving guard cannot hold Connect back.
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

  const [selectedId, setSelectedId] = useState<string>();
  // Preselected so Continue is ready without a pick; kept among the visible results so a filter
  // never leaves Continue acting on a row it hid.
  const pickedId = results.some(({ id }) => id === selectedId) ? selectedId : results[0]?.id;
  const selection = useMemo(() => ({ connectorId: pickedId }), [pickedId]);

  const connector = useMemo(() => connectors.find((entry) => entry.id === connectorId), [connectors, connectorId]);
  const credentialForm = connector?.credentialForm;

  // Takes its connector as an argument: `connectorId` is not applied yet in the tick it is chosen.
  const submit = useCallback(
    (target: ConnectorEntry, values?: Record<string, any>) => {
      setError(undefined);

      // Validation runs here rather than after the panel closes, so its message has somewhere to go.
      const validate = target.credentialForm?.onValidate
        ? target.credentialForm.onValidate({ values: values as never, connector: target })
        : Effect.void;

      // Returned so the form's `saving` guard keeps Save disabled while the connection is created.
      return EffectEx.runPromise(
        validate.pipe(
          Effect.andThen(Effect.promise(async () => onCreateObject({ connectorId: target.id, values }))),
          Effect.catch((failure) =>
            Effect.sync(() => {
              log.catch(failure);
              setError(String(failure instanceof Error ? failure.message : failure));
            }),
          ),
        ),
      );
    },
    [onCreateObject],
  );

  const handleContinue = useCallback(
    ({ connectorId }: ConnectorSelection) => {
      const entry = connectors.find(({ id }) => id === connectorId);
      if (!entry) {
        return;
      }
      setConnectorId(entry.id);
      if (!entry.credentialForm) {
        setPending(true);
        void submit(entry).finally(() => setPending(false));
      }
    },
    [connectors, submit],
  );

  const handleBack = useCallback(() => {
    setConnectorId(undefined);
    setError(undefined);
  }, []);

  if (!connector) {
    return (
      <Form.Root schema={ConnectorSelection} values={selection} onSave={handleContinue} onCancel={onCancel}>
        <Form.Content>
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
                  checked={entry.id === pickedId}
                  onSelect={() => setSelectedId(entry.id)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Root>
          <Form.Actions submitLabel={t('continue.label')} submitIcon='ph--arrow-right--regular' />
        </Form.Content>
      </Form.Root>
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
          onSave={(values) => submit(connector, values)}
          onCancel={handleBack}
        >
          <Form.Content>
            <Form.Fields />
            <Form.Actions />
          </Form.Content>
        </Form.Root>
      ) : (
        <Form.Root
          schema={NoValues}
          values={{}}
          onSave={() => (pending ? undefined : submit(connector))}
          onCancel={handleBack}
        >
          <Form.Content>
            <Form.Actions
              submitLabel={t('connect-service.label', { service: connector.label ?? connector.id })}
              submitIcon='ph--plugs-connected--regular'
              submitDisabled={pending}
            />
          </Form.Content>
        </Form.Root>
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
