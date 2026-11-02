//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Database, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { useMembers } from '@dxos/halo-react';
import { log } from '@dxos/log';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { Form } from '@dxos/react-ui-form';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { ConnectorNamespace } from '../../namespace.ts';
import { Connector, type ConnectorEntry, type ConnectorKind } from '../../types/ConnectorSpec.ts';

/** Picker order: connecting as Composer first, then as yourself, then your own credentials. */
const KIND_ORDER: readonly ConnectorKind[] = ['app', 'user', 'custom'];

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
  target,
  onCreateObject,
  onCancel,
  connectors: connectorsProp,
}: CreateConnectionPanelProps) => {
  const { t } = UiHooks.useTranslation(ConnectorNamespace.key);
  const capabilityConnectors = Hooks.useCapabilities(Connector).flat();
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
  const groups = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({ kind, entries: results.filter((entry) => entry.kind === kind) })).filter(
        ({ entries }) => entries.length > 0,
      ),
    [results],
  );

  // Preselected so Continue is ready without a pick: the first row shown, and kept among the visible
  // results so a filter never leaves Continue acting on a row it hid.
  const pickedId = results.some(({ id }) => id === selectedId) ? selectedId : groups[0]?.entries[0]?.id;
  const selection = useMemo(() => ({ connectorId: pickedId }), [pickedId]);

  const connector = useMemo(() => connectors.find((entry) => entry.id === connectorId), [connectors, connectorId]);
  const credentialForm = connector?.credentialForm;

  // Every member of a space can use its connections, so a user-kind one lends the connecting
  // person's account to all of them. Read from the highlighted row too: an OAuth connector starts
  // its flow on Continue, so the warning has to show before it.
  const spaceId = Database.isDatabase(target) ? target.spaceId : Obj.getDatabase(target)?.spaceId;
  const members = useMembers(spaceId);
  // A space's member list always includes the current identity, so an empty one is still loading;
  // a user connection waits for it, or it could start before the warning has a chance to show.
  const membersPending = spaceId !== undefined && members.length === 0;
  const considered = connector ?? connectors.find(({ id }) => id === pickedId);
  const holdBack = considered?.kind === 'user' && membersPending;
  const sharedAccountNote = considered?.kind === 'user' && members.length > 1 && (
    <Banner.Root valence='warning' data-testid='create-connection-panel.shared-account'>
      <Banner.Title>{t('user-connection-shared.title')}</Banner.Title>
      {/* An MCP server lets every member's agent write as this account, not just sync through it. */}
      <Banner.Body>
        {considered.mcp
          ? t('user-connection-shared-mcp.message', { service: considered.label ?? considered.id })
          : t('user-connection-shared.message')}
      </Banner.Body>
    </Banner.Root>
  );

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
      if (!entry || (entry.kind === 'user' && membersPending)) {
        return;
      }
      setConnectorId(entry.id);
      if (!entry.credentialForm) {
        setPending(true);
        void submit(entry).finally(() => setPending(false));
      }
    },
    [connectors, membersPending, submit],
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
              {groups.map(({ kind, entries }) => (
                <SearchList.Group key={kind} heading={t(`connector-kind.${kind}.label`)}>
                  {entries.map((entry) => (
                    <SearchList.Item
                      key={entry.id}
                      value={entry.id}
                      label={entry.label ?? entry.id}
                      icon='ph--plugs-connected--regular'
                      checked={entry.id === pickedId}
                      onSelect={() => setSelectedId(entry.id)}
                    />
                  ))}
                </SearchList.Group>
              ))}
            </SearchList.Viewport>
          </SearchList.Root>
          {sharedAccountNote}
          <Form.Actions
            submitLabel={t('continue.label')}
            submitIcon='ph--arrow-right--regular'
            submitDisabled={holdBack}
          />
        </Form.Content>
      </Form.Root>
    );
  }

  // No `Column` wrapper here: the create-object dialog already establishes one, and nesting a
  // second inset the whole form inside it.
  return (
    <>
      {sharedAccountNote}
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
