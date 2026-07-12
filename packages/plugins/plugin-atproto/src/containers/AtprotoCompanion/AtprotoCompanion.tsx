//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Connection } from '@dxos/plugin-connector';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Button, Message, Panel, ScrollArea, Tag, useTranslation } from '@dxos/react-ui';
import { Treegrid } from '@dxos/react-ui-list';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type PublishFieldNote } from '@dxos/schema';

import { meta } from '#meta';
import { AtprotoCapabilities, AtprotoPublication } from '#types';

import { getFieldPublishFlags } from '../../annotation';
import { isAtprotoConnection } from '../../connection';
import { resolveDisplayValue } from '../../field-values';
import {
  type DisplayStatus,
  computeStatus,
  deriveDisplayStatus,
  encodeRecord,
  inspectPublish,
  publishObject,
  unpublishObject,
} from '../../publish';
import * as AtprotoRepo from '../../services/AtprotoRepo';

export type AtprotoCompanionProps = AppSurface.ArticleProps<Obj.Unknown>;

type StatusValence = 'neutral' | 'info' | 'success' | 'warning';

const STATUS_META: Record<DisplayStatus, { key: string; icon: string; valence: StatusValence }> = {
  unknown: { key: 'status-unknown.label', icon: 'ph--wifi-slash--regular', valence: 'warning' },
  ineligible: { key: 'status-ineligible.label', icon: 'ph--prohibit--regular', valence: 'neutral' },
  ready: { key: 'status-ready.label', icon: 'ph--cloud-arrow-up--regular', valence: 'info' },
  published: { key: 'status-published.label', icon: 'ph--cloud-check--regular', valence: 'success' },
  outOfDate: { key: 'status-out-of-date.label', icon: 'ph--cloud-arrow-up--regular', valence: 'warning' },
};

// Inline-start inset per nesting level (Treegrid's own row-level indentation is calibrated for deep
// navtrees; nested field rows are indented directly, following ProcessTree).
const INDENT_REM = 1;

/**
 * Generic atproto publishing companion: shows the object's public projection (which fields the network
 * sees vs. which stay private/linked, as a treegrid), the publish status, and a publish / update /
 * unpublish toolbar against the space's atproto connection.
 */
export const AtprotoCompanion = ({ subject, role, attendableId }: AtprotoCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const makeRepoLayer = useCapability(AtprotoCapabilities.RepoLayer);
  const db = Obj.getDatabase(subject);
  // Subscribe to the object so edits recompute status and field values (read from this snapshot).
  const [live] = useObject(subject);

  const allConnections = useQuery(db, Filter.type(Connection.Connection));
  const connections = useMemo(() => allConnections.filter(isAtprotoConnection), [allConnections]);
  const connection = connections[0];

  const publications = useQuery(
    db,
    Query.select(Filter.id(subject.id)).targetOf(AtprotoPublication.AtprotoPublication),
  );
  const publication = publications.find(AtprotoPublication.instanceOf);

  const fields = useMemo(() => {
    const type = Obj.getType(subject);
    return type ? getFieldPublishFlags(Type.getSchema(type)) : [];
  }, [subject]);

  // Undefined until the first (async, network-aware) derivation resolves — the UI shows a neutral
  // "checking" state rather than flashing a definitive (possibly wrong) status.
  const [status, setStatus] = useState<DisplayStatus | undefined>();
  const [canPublish, setCanPublish] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState<string | undefined>();
  const [mirrorResolved, setMirrorResolved] = useState<boolean | undefined>();
  const [fieldNotes, setFieldNotes] = useState<Record<string, PublishFieldNote>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Codec encoding is async (WASM-backed), inspection is network-aware, and displayed field values may
  // resolve refs — so publish state and values are derived in an effect and refreshed when the object
  // mutates (`live`) or its publication changes. Note: this subscribes to the subject only, not to the
  // targets of ref-typed fields (e.g. a review Text), so edits to a ref's content refresh here only on
  // the next subject mutation or remount, not live.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const record = await encodeRecord(subject);
      const publishStatus = await computeStatus(subject, publication);
      const inspection = await inspectPublish(subject);
      const nextValues: Record<string, string> = {};
      for (const field of fields) {
        if (!field.group && field.visibility !== 'private') {
          nextValues[field.path] = await resolveDisplayValue(Obj.getValue(subject, field.path.split('.')));
        }
      }
      if (!cancelled) {
        setCanPublish(Boolean(record) && inspection.eligibility.ok);
        setIneligibleReason(inspection.eligibility.ok ? undefined : inspection.eligibility.reason);
        setMirrorResolved(inspection.mirrorResolved);
        setFieldNotes(inspection.fieldNotes ?? {});
        setValues(nextValues);
        setStatus(deriveDisplayStatus(publishStatus, inspection.eligibility));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subject, publication, live, fields]);

  const run = useCallback(
    async (program: Effect.Effect<unknown, unknown, AtprotoRepo.Service>) => {
      if (!connection || !db) {
        return;
      }
      setBusy(true);
      setError(undefined);
      try {
        await EffectEx.runPromise(program.pipe(Effect.provide(makeRepoLayer(connection))));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
        setConfirming(false);
      }
    },
    [connection, db, makeRepoLayer],
  );

  const handlePublish = useCallback(() => {
    if (!connection || !db) {
      return;
    }
    // First publish requires explicit confirmation; updates are silent.
    if (!publication && !confirming) {
      setConfirming(true);
      return;
    }
    void run(publishObject({ object: subject, connection, db, existing: publication }));
  }, [connection, db, subject, publication, confirming, run]);

  const handleUnpublish = useCallback(() => {
    if (!db || !publication) {
      return;
    }
    void run(unpublishObject({ publication, db }));
  }, [db, publication, run]);

  // The publish controls are data (an action graph), rebuilt when the reactive state they depend on
  // changes. The primary publish/update action is always shown, disabled when already in sync.
  const menuActions = useMenuBuilder(() => {
    const inSync = status === 'published';
    const builder = MenuBuilder.make()
      .root({ label: ['publish-actions.label', { ns: meta.profile.key }] })
      .action(
        'publish',
        {
          // "Update" once a record exists (regardless of status), "Publish" for the first push.
          label: [publication ? 'update.label' : 'publish.label', { ns: meta.profile.key }],
          icon: 'ph--cloud-arrow-up--regular',
          disabled: busy || !connection || !canPublish || inSync,
        },
        handlePublish,
      );
    if (publication) {
      builder.action(
        'unpublish',
        { label: ['unpublish.label', { ns: meta.profile.key }], icon: 'ph--cloud-slash--regular', disabled: busy },
        handleUnpublish,
      );
    }
    return builder.build();
  }, [status, busy, canPublish, connection, publication, handlePublish, handleUnpublish]);

  const statusMeta = status ? STATUS_META[status] : undefined;
  // An unverifiable state (offline) is a transient info; a definitive block is a warning.
  const reasonValence = status === 'unknown' ? 'info' : 'warning';
  // Whether the object has any Mirrored fields whose upstream link failed to resolve — those fields
  // are then visible nowhere despite their tag.
  const mirroredUnresolved =
    mirrorResolved === false && fields.some((field) => !field.group && field.visibility === 'mirror');
  // Published field values at last publish; a Published field whose current value differs has diverged
  // (and is what puts the object out of sync). Absent on older publications.
  const publishedValues = publication?.publishedValues;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...menuActions} attendableId={attendableId}>
          <Menu.Toolbar />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <div role='none' className='flex flex-col gap-3 p-3'>
              {/* Publish status — the status icon overrides the Message's default valence icon. A
                  neutral "checking" state shows until the first async derivation resolves. */}
              <Message.Root
                valence={statusMeta?.valence ?? 'neutral'}
                icon={statusMeta?.icon ?? 'ph--circle-notch--regular'}
              >
                <Message.Title>{t(statusMeta?.key ?? 'status-checking.label')}</Message.Title>
              </Message.Root>

              {/* Reasons publishing is unavailable. */}
              {!connection && (
                <Message.Root valence='info'>
                  <Message.Content>{t('no-connection.label')}</Message.Content>
                </Message.Root>
              )}
              {ineligibleReason && (
                <Message.Root valence={reasonValence}>
                  <Message.Content>{ineligibleReason}</Message.Content>
                </Message.Root>
              )}
              {error && (
                <Message.Root valence='error'>
                  <Message.Content>{error}</Message.Content>
                </Message.Root>
              )}

              {/* First-publish confirmation. */}
              {confirming && (
                <Message.Root valence='warning'>
                  <Message.Content>{t('confirm-publish.message')}</Message.Content>
                  <Message.Content asChild>
                    <div role='none' className='flex gap-2 pbs-2'>
                      <Button variant='primary' disabled={busy} onClick={handlePublish}>
                        {t('confirm-publish.label')}
                      </Button>
                      <Button disabled={busy} onClick={() => setConfirming(false)}>
                        {t('cancel.label')}
                      </Button>
                    </div>
                  </Message.Content>
                </Message.Root>
              )}

              {/* Public projection: what the network sees, as a treegrid. Each leaf is tagged Published (we
                  publish it), Mirrored (the network sees it via a linked upstream record), or Private;
                  fields whose local value diverges from the mirrored record are flagged Diverged (not pushed). */}
              <div role='none' className='flex flex-col gap-1'>
                <h2 className='text-xs uppercase tracking-wide text-description'>{t('network-view.label')}</h2>
                {mirroredUnresolved && (
                  <Message.Root valence='warning'>
                    <Message.Content>{t('mirror-unresolved.label')}</Message.Content>
                  </Message.Root>
                )}
                <Treegrid.Root gridTemplateColumns='minmax(0, 1fr) minmax(0, 1fr) min-content' classNames='gap-x-3'>
                  {fields.map((field) => {
                    const published = field.visibility === 'publish';
                    const mirrored = field.visibility === 'mirror';
                    const visible = published || mirrored;
                    const value = !field.group && visible ? values[field.path] : undefined;
                    // Diverged from the network's current value — the source depends on visibility:
                    // a Mirrored field differs from the upstream record (from inspect); a Published field
                    // differs from what we last published (the snapshot). The two are mutually exclusive by
                    // visibility, so a Published field is never judged against upstream (which would false-
                    // positive when its value is deliberately different from the catalog).
                    const diverged =
                      !field.group &&
                      ((mirrored && fieldNotes[field.path]?.diverged) ||
                        (published &&
                          value !== undefined &&
                          typeof publishedValues?.[field.path] === 'string' &&
                          publishedValues[field.path] !== value));
                    return (
                      <Treegrid.Row
                        key={field.path}
                        id={field.path.replaceAll('.', '~')}
                        classNames={[
                          'grid grid-cols-subgrid col-span-full items-center py-0.5',
                          field.group ? 'font-medium' : 'font-normal',
                        ]}
                      >
                        <Treegrid.Cell
                          classNames='flex items-center'
                          style={field.depth > 0 ? { paddingInlineStart: `${field.depth * INDENT_REM}rem` } : undefined}
                        >
                          <span className={`truncate text-sm ${field.group || visible ? '' : 'text-description'}`}>
                            {field.name}
                          </span>
                        </Treegrid.Cell>
                        <Treegrid.Cell classNames='truncate text-sm text-description'>{value}</Treegrid.Cell>
                        <Treegrid.Cell classNames='flex shrink-0 items-center justify-end gap-1'>
                          {!field.group && (
                            <>
                              {diverged && <Tag hue='warning'>{t('diverged-field.label')}</Tag>}
                              <Tag hue={published ? 'success' : mirrored ? 'info' : 'neutral'}>
                                {published
                                  ? t('published-field.label')
                                  : mirrored
                                    ? t('mirrored-field.label')
                                    : t('private-field.label')}
                              </Tag>
                            </>
                          )}
                        </Treegrid.Cell>
                      </Treegrid.Row>
                    );
                  })}
                </Treegrid.Root>
              </div>
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
