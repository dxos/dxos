//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { Obj, Relation } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { SyncBinding } from '../../types';

// The action section uses Form's `settings` variant purely for its labeled-row chrome
// (action-mode `Form.Row`s); there are no fields to bind, so the schema is empty.
const ACTIONS_SCHEMA = Schema.Struct({});
const ACTIONS_VALUES = {};

export type ConnectionViewProps = {
  /** Article surface role threaded to `Panel.Root`. */
  role?: string;
  /** Display title for the connection (name / account / connector label). */
  title: string;
  /** Secondary line under the title (connector label · account, or token source). */
  source?: string;
  /** True when no service plugin is registered for this connection's connector. */
  hasConnector: boolean;
  /** Sync bindings sourced by this connection. */
  bindings: ReadonlyArray<SyncBinding.SyncBinding>;
  /** Schema describing per-binding `.options`; absent for connectors without per-binding options. */
  optionsSchema?: Schema.Schema<any, any>;
  /** True when the connector exposes a `sync` operation (drives Sync-now visibility). */
  canSync: boolean;
  /** True when the connector exposes `getSyncTargets` (drives Change-targets visibility). */
  canChangeTargets: boolean;
  /** True while a sync is in flight. */
  syncing: boolean;
  /** True while the sync-targets dialog is being prepared. */
  loadingTargets: boolean;
  /** True when sync-target discovery is ready to open the dialog. */
  syncTargetsAvailable: boolean;
  onSync: () => void;
  onChangeTargets: () => void;
  onDelete: () => void;
  onRemoveBinding: (binding: SyncBinding.SyncBinding) => void;
};

/**
 * Presentational settings surface for a {@link Connection}: header, the
 * sync/change-targets/delete actions, and the list of sync bindings (each with
 * its status and, when the connector defines one, a schema-driven options form).
 *
 * Pure presentation — every capability-resolved value and handler arrives as a
 * prop so the component mounts in storybook without a PluginManager.
 */
export const ConnectionView = ({
  role,
  title,
  source,
  hasConnector,
  bindings,
  optionsSchema,
  canSync,
  canChangeTargets,
  syncing,
  loadingTargets,
  syncTargetsAvailable,
  onSync,
  onChangeTargets,
  onDelete,
  onRemoveBinding,
}: ConnectionViewProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Form.Root variant='settings' schema={ACTIONS_SCHEMA} values={ACTIONS_VALUES}>
              <Form.Viewport>
                <Form.Content>
                  <Form.Section title={title} description={source}>
                    {!hasConnector && (
                      <p className='px-trim-md text-description'>
                        {t('no-connector.message', {
                          defaultValue: 'No service plugin is registered for this connection.',
                        })}
                      </p>
                    )}

                    {/* Hide Sync now entirely when the connector has no `sync` op. */}
                    {canSync && (
                      <Form.Row
                        label={t('sync-now.label', { defaultValue: 'Sync now' })}
                        description={t('sync-now.description', {
                          defaultValue: 'Reconcile cards with the remote service.',
                        })}
                      >
                        <Button onClick={onSync} disabled={syncing || bindings.length === 0}>
                          {syncing
                            ? t('syncing.label', { defaultValue: 'Syncing…' })
                            : t('sync-now.label', { defaultValue: 'Sync now' })}
                        </Button>
                      </Form.Row>
                    )}

                    {/* Only show change-targets for connectors that support user-pickable targets. */}
                    {canChangeTargets && (
                      <Form.Row
                        label={t('change-targets.label', { defaultValue: 'Change sync targets' })}
                        description={t('change-targets.description', {
                          defaultValue: 'Pick which remote items this connection syncs into the space.',
                        })}
                      >
                        <Button onClick={onChangeTargets} disabled={!syncTargetsAvailable || loadingTargets}>
                          {loadingTargets
                            ? t('loading.label', { defaultValue: 'Loading…' })
                            : t('change-targets.label', { defaultValue: 'Change sync targets' })}
                        </Button>
                      </Form.Row>
                    )}

                    <Form.Row
                      label={t('delete-connection.label', { defaultValue: 'Delete connection' })}
                      description={t('delete-connection.description', {
                        defaultValue: 'Remove this connection and its sync bindings.',
                      })}
                    >
                      <Button onClick={onDelete}>
                        {t('delete-connection.label', { defaultValue: 'Delete connection' })}
                      </Button>
                    </Form.Row>
                  </Form.Section>

                  {/* Hide the sync-targets section for connectors that don't sync. */}
                  {canSync && (
                    <Form.Section title={t('targets.label', { defaultValue: 'Sync targets' })}>
                      {bindings.length === 0 ? (
                        <p className='px-trim-md text-description'>
                          {canChangeTargets
                            ? t('no-targets.message', {
                                defaultValue: 'No targets selected. Click "Change sync targets" to choose.',
                              })
                            : t('no-targets-yet.message', {
                                defaultValue: 'No targets yet — finish OAuth to set up the default target.',
                              })}
                        </p>
                      ) : (
                        bindings.map((binding) => (
                          <BindingRow
                            key={binding.id}
                            binding={binding}
                            optionsSchema={optionsSchema}
                            onRemove={onRemoveBinding}
                          />
                        ))
                      )}
                    </Form.Section>
                  )}
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

/**
 * One sync binding, rendered as a settings item ({@link Form.Row} in action mode): the binding's
 * name is the item label, its sync status the description, any sync error the validation slot, and
 * — when the target is missing — a remove button in the control slot. When the connector declares
 * an options schema and the target is live, a schema-driven options form follows the item; it keeps
 * the default (flat) variant so its fields render inline rather than each in its own settings-card border.
 *
 * When the binding's target object has been deleted, the item surfaces that state and offers to
 * remove the now-orphaned binding (relations don't cascade-delete, so a target deleted elsewhere
 * leaves a dangling binding).
 */
const BindingRow = ({
  binding,
  optionsSchema,
  onRemove,
}: {
  binding: SyncBinding.SyncBinding;
  optionsSchema?: Schema.Schema<any, any>;
  onRemove: (binding: SyncBinding.SyncBinding) => void;
}) => {
  const { t } = useTranslation(meta.profile.key);
  // Resolving the relation endpoint can throw if the target reference is entirely
  // unresolvable; treat that the same as a deleted target.
  const target = useMemo(() => {
    try {
      return Relation.getTarget(binding);
    } catch {
      return undefined;
    }
  }, [binding]);
  const [resolvedTarget] = useObject(target);
  const missing = !resolvedTarget || Obj.isDeleted(resolvedTarget);
  // Label precedence: explicit binding name → remote id → the target's own label → its type's
  // translated label (single-target connectors leave a binding without a name/remoteId, e.g.
  // Gmail's Mailbox). Sync status lives in the description, so the label never describes sync progress.
  const targetTypename = resolvedTarget ? Obj.getTypename(resolvedTarget) : undefined;
  const label: string =
    binding.name ??
    binding.remoteId ??
    (resolvedTarget ? Obj.getLabel(resolvedTarget) : undefined) ??
    (targetTypename ? t('typename.label', { ns: targetTypename, defaultValue: targetTypename }) : undefined) ??
    t('sync-target.label', { defaultValue: 'Sync target' });

  const status = missing
    ? t('binding-target-missing.message', {
        defaultValue: 'Synced object was deleted. Remove this binding to clean it up.',
      })
    : binding.lastSyncAt
      ? `${t('last-sync.label', { defaultValue: 'Last synced' })}: ${new Date(binding.lastSyncAt).toLocaleString()}`
      : t('never-synced.label', { defaultValue: 'Never synced' });

  // Seed the options form from the binding's current options; SyncBinding is an ECHO relation,
  // so edits persist via `Relation.update`.
  const defaultValues = useMemo(() => ({ ...(binding.options ?? {}) }), [binding.options]);
  const handleOptionsChanged = useCallback(
    (values: Record<string, any>) => {
      Relation.update(binding, (binding) => {
        binding.options = { ...values };
      });
    },
    [binding],
  );

  return (
    <Form.Row
      label={label}
      description={status}
      validation={
        !missing && binding.lastError ? <span className='text-sm text-error-text'>{binding.lastError}</span> : undefined
      }
    >
      {missing ? (
        <Button onClick={() => onRemove(binding)}>
          {t('remove-binding.label', { defaultValue: 'Remove binding' })}
        </Button>
      ) : undefined}

      {/* Per-binding options: flat (default variant) so fields render inline rather than each in a border. */}
      {optionsSchema && !missing && (
        <Form.Root schema={optionsSchema} defaultValues={defaultValues} onValuesChanged={handleOptionsChanged}>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Root>
      )}
    </Form.Row>
  );
};
