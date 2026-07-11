//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Button, Icon, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';

import { Connection } from '@dxos/plugin-connector';

import { meta } from '#meta';
import { AtprotoCapabilities, AtprotoPublication } from '#types';

import { getFieldPublishFlags } from '../../annotation';
import { isAtprotoConnection } from '../../connection';
import { type PublishStatus, computeStatus, encodeRecord, publishObject, unpublishObject } from '../../publish';
import * as AtprotoRepo from '../../services/AtprotoRepo';

export type AtprotoCompanionProps = AppSurface.ArticleProps<Obj.Unknown>;

const STATUS_META: Record<PublishStatus, { key: string; icon: string; className: string }> = {
  unpublished: { key: 'status-unpublished.label', icon: 'ph--cloud-slash--regular', className: 'text-description' },
  published: { key: 'status-published.label', icon: 'ph--cloud-check--regular', className: 'text-success-text' },
  outOfDate: { key: 'status-out-of-date.label', icon: 'ph--cloud-arrow-up--regular', className: 'text-warning-text' },
};

const formatValue = (value: unknown): string => {
  if (value == null) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
};

/**
 * Generic atproto publishing companion: shows the object's public projection (which fields the
 * network sees vs. which stay private), the publish status, and publish / re-publish / unpublish
 * actions against the space's atproto connection.
 */
export const AtprotoCompanion = ({ subject, role }: AtprotoCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const makeRepoLayer = useCapability(AtprotoCapabilities.RepoLayer);
  const db = Obj.getDatabase(subject);
  // Subscribe to the object so edits recompute publish status.
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

  const [status, setStatus] = useState<PublishStatus>('unpublished');
  const [canPublish, setCanPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Codec encoding is async (WASM-backed), so status is derived in an effect and refreshed when the
  // object mutates (`live`) or its publication changes.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const record = await encodeRecord(subject);
      const nextStatus = await computeStatus(subject, publication);
      if (!cancelled) {
        setCanPublish(Boolean(record));
        setStatus(nextStatus);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subject, publication, live]);

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
    // First publish requires explicit confirmation; re-publishes are silent.
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

  const statusMeta = STATUS_META[status];

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <div role='none' className='flex flex-col gap-4 p-4'>
              {/* Publish status. */}
              <div role='none' className={`flex items-center gap-2 ${statusMeta.className}`}>
                <Icon icon={statusMeta.icon} size={5} />
                <span className='text-sm'>{t(statusMeta.key)}</span>
              </div>

              {/* Public projection: what the network sees. Private (unmarked) fields are de-emphasized. */}
              <div role='none' className='flex flex-col gap-1'>
                <h2 className='text-xs uppercase tracking-wide text-description'>{t('network-view.label')}</h2>
                {fields.map((field) => (
                  <div
                    key={field.name}
                    role='none'
                    className={`grid grid-cols-[1rem_8rem_1fr] items-center gap-2 py-0.5 ${
                      field.published ? '' : 'text-description'
                    }`}
                  >
                    <Icon
                      icon={field.published ? 'ph--globe--regular' : 'ph--lock--regular'}
                      size={4}
                      classNames={field.published ? 'text-success-text' : 'text-description'}
                    />
                    <span className='truncate text-sm'>{field.name}</span>
                    <span className='truncate text-sm'>
                      {field.published ? formatValue(Obj.getValue(subject, [field.name])) : t('private-field.label')}
                    </span>
                  </div>
                ))}
              </div>

              {error && (
                <div role='none' className='text-sm text-error-text'>
                  {error}
                </div>
              )}

              {/* Actions. */}
              {!connection ? (
                <div role='none' className='text-sm text-description'>
                  {t('no-connection.label')}
                </div>
              ) : confirming ? (
                <div role='none' className='flex flex-col gap-2'>
                  <p className='text-sm'>{t('confirm-publish.message')}</p>
                  <div role='none' className='flex gap-2'>
                    <Button variant='primary' disabled={busy} onClick={handlePublish}>
                      {t('confirm-publish.label')}
                    </Button>
                    <Button disabled={busy} onClick={() => setConfirming(false)}>
                      {t('cancel.label')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div role='none' className='flex gap-2'>
                  {status === 'unpublished' && (
                    <Button variant='primary' disabled={busy || !canPublish} onClick={handlePublish}>
                      {t('publish.label')}
                    </Button>
                  )}
                  {status === 'outOfDate' && (
                    <Button variant='primary' disabled={busy} onClick={handlePublish}>
                      {t('republish.label')}
                    </Button>
                  )}
                  {publication && (
                    <Button disabled={busy} onClick={handleUnpublish}>
                      {t('unpublish.label')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
