//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Connection } from '@dxos/plugin-connector';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Button, Card, Icon, Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { MasterDetail, type MasterDetailAdornment, type MasterDetailIcon } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { AccessToken } from '@dxos/types';
import { getStyles } from '@dxos/ui-theme';

import { meta } from '#meta';
import { AtprotoCapabilities } from '#types';

import { ATPROTO_SOURCES, isAtprotoConnection } from '../../connection';
import { getAtprotoUris } from '../../foreign-key';
import { importRecord } from '../../publish';
import { getMappedCollections } from '../../schema-map';
import * as AtprotoRepo from '../../services/AtprotoRepo';

export type PdsBrowserProps = {
  role?: string;
  space: Space;
};

type CollectionItem = { id: string };
type RecordItem = { id: string; record: AtprotoRepo.RepoRecord };

/**
 * Browse the collections and records on an atproto repo (PDS) as a nested master-detail: collections →
 * records → record. Reads any repo by handle (public). Collections that a plugin has a schema mapping
 * for are marked; their records preview as ECHO objects (readonly card surface) and can be imported.
 */
export const PdsBrowser = ({ role, space }: PdsBrowserProps) => {
  const { t } = useTranslation(meta.profile.key);
  const readRepoLayer = useCapability(AtprotoCapabilities.ReadRepoLayer);

  const connections = useQuery(space.db, Filter.type(Connection.Connection));
  const tokens = useQuery(space.db, Filter.type(AccessToken.AccessToken));
  const connectedHandles = useMemo(
    () =>
      new Set(
        tokens.filter((token) => ATPROTO_SOURCES.has(token.source) && token.account).map((token) => token.account),
      ),
    [tokens],
  );
  const defaultHandle = useMemo(
    () => tokens.find((token) => ATPROTO_SOURCES.has(token.source) && token.account)?.account,
    [tokens],
  );

  const mapped = useMemo(() => getMappedCollections(space), [space]);

  const [handleInput, setHandleInput] = useState('');
  const [activeHandle, setActiveHandle] = useState<string | undefined>();
  const [collections, setCollections] = useState<string[]>([]);
  const [collection, setCollection] = useState<string | undefined>();
  const [records, setRecords] = useState<AtprotoRepo.RepoRecord[]>([]);
  const [recordUri, setRecordUri] = useState<string | undefined>();
  const [preview, setPreview] = useState<Obj.Unknown | undefined>();
  const [error, setError] = useState<string | undefined>();

  // Default the handle to the connected account (if any).
  useEffect(() => {
    if (!activeHandle && defaultHandle) {
      setActiveHandle(defaultHandle);
      setHandleInput(defaultHandle);
    }
  }, [activeHandle, defaultHandle]);

  const run = useCallback(
    <A,>(program: Effect.Effect<A, unknown, AtprotoRepo.Service>): Promise<A> | undefined =>
      activeHandle ? EffectEx.runPromise(program.pipe(Effect.provide(readRepoLayer(activeHandle)))) : undefined,
    [activeHandle, readRepoLayer],
  );

  // Load collections for the active repo.
  useEffect(() => {
    setCollection(undefined);
    setCollections([]);
    if (!activeHandle) {
      return;
    }
    let cancelled = false;
    setError(undefined);
    void run(Effect.flatMap(AtprotoRepo.Service, (repo) => repo.describeRepo()))
      ?.then((result) => !cancelled && setCollections(result))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [activeHandle, run]);

  // Load records for the selected collection.
  useEffect(() => {
    setRecordUri(undefined);
    setRecords([]);
    if (!collection) {
      return;
    }
    let cancelled = false;
    setError(undefined);
    void run(Effect.flatMap(AtprotoRepo.Service, (repo) => repo.listRecords({ collection })))
      ?.then((result) => !cancelled && setRecords(result.records))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [collection, run]);

  const mappedForCollection = collection ? mapped.get(collection) : undefined;
  const record = records.find((entry) => entry.uri === recordUri);

  // Query the mapped type normally (resolving its schema) and check foreign keys in memory, rather than
  // a foreign-key index query — an index query over a code-defined (non-space-registered) schema logs
  // "unable to resolve schema" and yields unresolved objects.
  const mappedObjects = useQuery(
    space.db,
    mappedForCollection ? Filter.type(mappedForCollection.type) : Filter.nothing(),
  );
  const alreadyImported = !!recordUri && mappedObjects.some((object) => getAtprotoUris(object).includes(recordUri));

  // Decode the selected record to an in-memory ECHO object for mapped collections, and run the same
  // post-import enrichment import does, so the preview card matches the imported object exactly.
  useEffect(() => {
    setPreview(undefined);
    if (!record || !mappedForCollection) {
      return;
    }
    let cancelled = false;
    const codec = mappedForCollection.record.codec;
    void (async () => {
      const decoded = await codec.decode(record.value);
      if (cancelled) {
        return;
      }
      const object = Obj.make(mappedForCollection.type, decoded);
      await codec.onImport?.(object);
      if (!cancelled) {
        setPreview(object);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [record, mappedForCollection]);

  const handleImport = useCallback(() => {
    if (!record || !mappedForCollection || !collection) {
      return;
    }
    // Bind as published only when the repo is one of our connected accounts.
    const connection =
      activeHandle && connectedHandles.has(activeHandle) ? connections.find(isAtprotoConnection) : undefined;
    void EffectEx.runPromise(
      importRecord({
        type: mappedForCollection.type,
        codec: mappedForCollection.record.codec,
        collection,
        record,
        connection,
        db: space.db,
      }),
    ).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [record, mappedForCollection, collection, activeHandle, connectedHandles, connections, space]);

  const collectionItems: CollectionItem[] = useMemo(() => collections.map((nsid) => ({ id: nsid })), [collections]);
  const recordItems: RecordItem[] = useMemo(
    () => records.map((entry) => ({ id: entry.uri, record: entry })),
    [records],
  );

  const getCollectionIcon = useCallback(
    (_get: unknown, item: CollectionItem): MasterDetailIcon => ({
      icon: mapped.has(item.id) ? 'ph--puzzle-piece--regular' : 'ph--cube--regular',
    }),
    [mapped],
  );
  const getCollectionAdornment = useCallback(
    (_get: unknown, item: CollectionItem): MasterDetailAdornment | undefined =>
      mapped.has(item.id) ? { icon: 'ph--seal-check--regular', label: t('mapped.label') } : undefined,
    [mapped, t],
  );

  // Icon/hue from the decoded object's type, matching how the object renders as a card elsewhere.
  const previewIcon = preview
    ? (Obj.getIcon(preview) ?? { icon: 'ph--circle-dashed--regular', hue: undefined })
    : undefined;

  const recordDetail = record ? (
    <ScrollArea.Root orientation='vertical' classNames='flex-1 min-bs-0 overflow-hidden'>
      <ScrollArea.Viewport classNames='p-2'>
        <div role='none' className='flex flex-col gap-2'>
          <span className='font-mono text-xs text-description truncate'>{record.uri}</span>
          {mappedForCollection ? (
            <div role='none' className='flex flex-col gap-2'>
              {preview && previewIcon && (
                <Card.Root>
                  <Card.Header>
                    <Card.Block>
                      <Icon
                        icon={previewIcon.icon}
                        classNames={previewIcon.hue ? getStyles(previewIcon.hue).text : undefined}
                      />
                    </Card.Block>
                    <Card.Title>{Obj.getLabel(preview)}</Card.Title>
                  </Card.Header>
                  <Surface.Surface type={AppSurface.CardContent} data={{ subject: preview }} limit={1} />
                </Card.Root>
              )}
              {alreadyImported ? (
                <span className='text-sm text-success-text'>{t('imported.label')}</span>
              ) : (
                <Button variant='primary' classNames='self-start' onClick={handleImport}>
                  {t('import.label')}
                </Button>
              )}
            </div>
          ) : (
            <JsonHighlighter data={record.value} />
          )}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  ) : null;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='px-2'>
          <Icon icon='ph--at--regular' size={4} classNames='text-description' />
          <Input.Root>
            <Input.TextInput
              classNames='grow'
              placeholder={t('handle.placeholder')}
              value={handleInput}
              onChange={(event) => setHandleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setActiveHandle(handleInput.trim() || undefined);
                }
              }}
            />
          </Input.Root>
          <Button onClick={() => setActiveHandle(handleInput.trim() || undefined)}>{t('browse.label')}</Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col min-bs-0 plb-2'>
        {error && (
          <div role='none' className='px-2 pbe-2 text-sm text-error-text'>
            {error}
          </div>
        )}
        <MasterDetail<CollectionItem>
          orientation='horizontal'
          classNames='flex-1 min-bs-0'
          items={collectionItems}
          selectedId={collection}
          onSelect={setCollection}
          getLabel={(_get, item) => item.id}
          getIcon={getCollectionIcon}
          getAdornment={getCollectionAdornment}
          emptyLabel={t('no-collections.label')}
          detail={
            collection ? (
              <MasterDetail<RecordItem>
                orientation='horizontal'
                classNames='flex-1 min-bs-0'
                items={recordItems}
                selectedId={recordUri}
                onSelect={setRecordUri}
                getLabel={(_get, item) => item.record.rkey}
                getIcon={() => ({ icon: 'ph--file--regular' })}
                emptyLabel={t('no-records.label')}
                detail={recordDetail}
              />
            ) : null
          }
        />
      </Panel.Content>
    </Panel.Root>
  );
};
