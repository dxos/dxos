//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ObjectCard from '@dxos/app-toolkit/ObjectCard';
import { type Database, Filter, Obj } from '@dxos/echo';
import { Panproto } from '@dxos/echo-panproto';
import * as EffectEx from '@dxos/effect/EffectEx';
import { AccessToken, Connection } from '@dxos/link';
import { useQuery } from '@dxos/react-client/echo';
import {
  Button,
  Container,
  Empty,
  Field,
  Flex,
  Icon,
  Input,
  Panel,
  ScrollArea,
  Toolbar,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { meta } from '#meta';
import { AtprotoCapabilities } from '#types';

import { ATPROTO_SOURCES, isAtprotoConnection } from '../../connection.ts';
import { getAtprotoUris } from '../../foreign-key.ts';
import { importRecord } from '../../publish.ts';
import { getMappedCollections } from '../../schema-map.ts';
import * as AtprotoRepo from '../../services/AtprotoRepo.ts';

export type PdsBrowserProps = {
  role?: string;
  db: Database.Database;
};

type PaneRow = {
  id: string;
  label: string;
  icon: string;
  /** A status icon with a tooltip label (e.g. the 'mapped' badge). */
  adornment?: { icon: string; label: string };
};

type PaneListProps = {
  rows: readonly PaneRow[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  emptyLabel: string;
  detail?: ReactNode;
};

/**
 * One level of the browser: a selectable list in its own pane beside a detail pane, composed from `OrderedList` and two
 * Panels (master-detail is composed, not a component). The list sizes to its content up to `max-w-xs`; the detail takes
 * the rest and holds the next level.
 */
const PaneList = ({ rows, selectedId, onSelect, emptyLabel, detail }: PaneListProps) => (
  // `overflow-hidden` lets the panes shrink below their content so their own scroll areas engage.
  <Flex gap='sm' classNames='dx-grow overflow-hidden'>
    <Panel.Root classNames='shrink-0 w-max max-w-xs'>
      <Panel.Body>
        {rows.length === 0 ? (
          <Empty>{emptyLabel}</Empty>
        ) : (
          <OrderedList.Root<PaneRow>
            items={rows}
            getId={(row) => row.id}
            value={selectedId}
            onValueChange={(id) => onSelect(id)}
          >
            {({ items }) => (
              <OrderedList.Content scroll>
                {items.map((row) => (
                  <OrderedList.Item
                    key={row.id}
                    id={row.id}
                    canDrag={false}
                    highlightOnHover
                    // A click on the selected row clears the selection; the list selects any other row itself.
                    onClick={() => row.id === selectedId && onSelect(undefined)}
                  >
                    <OrderedList.ItemIcon>
                      <Icon icon={row.icon} />
                    </OrderedList.ItemIcon>
                    <OrderedList.ItemText>{row.label}</OrderedList.ItemText>
                    {row.adornment && (
                      <Tooltip.Trigger asChild side='bottom' content={row.adornment.label}>
                        <Icon icon={row.adornment.icon} />
                      </Tooltip.Trigger>
                    )}
                  </OrderedList.Item>
                ))}
              </OrderedList.Content>
            )}
          </OrderedList.Root>
        )}
      </Panel.Body>
    </Panel.Root>
    <Panel.Root classNames='flex-1 min-w-0'>
      <Panel.Body classNames='flex flex-col dx-grow'>{detail}</Panel.Body>
    </Panel.Root>
  </Flex>
);

/**
 * Browse the collections and records on an atproto repo (PDS) as a nested master-detail: collections →
 * records → record. Reads any repo by handle (public). Collections that a plugin has a schema mapping
 * for are marked; their records preview as ECHO objects (readonly card surface) and can be imported.
 */
export const PdsBrowser = ({ role, db }: PdsBrowserProps) => {
  const { t } = useTranslation(meta.profile.key);
  const readRepoLayer = Hooks.useCapability(AtprotoCapabilities.ReadRepoLayer);

  const connections = useQuery(db, Filter.type(Connection.Connection));
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
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

  const mapped = useMemo(() => getMappedCollections(db), [db]);

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
  const mappedObjects = useQuery(db, mappedForCollection ? Filter.type(mappedForCollection.type) : Filter.nothing());
  const alreadyImported = !!recordUri && mappedObjects.some((object) => getAtprotoUris(object).includes(recordUri));

  // Decode the selected record to an in-memory ECHO object for mapped collections, and run the same
  // post-import enrichment import does, so the preview card matches the imported object exactly.
  useEffect(() => {
    setPreview(undefined);
    if (!record || !mappedForCollection) {
      return;
    }
    let cancelled = false;
    const { lens } = mappedForCollection.record;
    const { policy } = mappedForCollection;
    void (async () => {
      const decoded = await Panproto.decode(record.value, lens);
      if (cancelled) {
        return;
      }
      const object = Obj.make(mappedForCollection.type, decoded);
      await policy?.onImport?.(object);
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
        lens: mappedForCollection.record.lens,
        policy: mappedForCollection.policy,
        collection,
        record,
        connection,
        db,
      }),
    ).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [record, mappedForCollection, collection, activeHandle, connectedHandles, connections, db]);

  const collectionRows: PaneRow[] = useMemo(
    () =>
      collections.map((nsid) => ({
        id: nsid,
        label: nsid,
        icon: mapped.has(nsid) ? 'ph--puzzle-piece--regular' : 'ph--cube--regular',
        adornment: mapped.has(nsid) ? { icon: 'ph--seal-check--regular', label: t('mapped.label') } : undefined,
      })),
    [collections, mapped, t],
  );
  const recordRows: PaneRow[] = useMemo(
    () => records.map((entry) => ({ id: entry.uri, label: entry.rkey, icon: 'ph--file--regular' })),
    [records],
  );

  const recordDetail = record ? (
    <ScrollArea.Root orientation='vertical' classNames='dx-grow overflow-hidden'>
      <ScrollArea.Viewport classNames='p-2'>
        <Container gap='md' gutter='none'>
          <span className='font-mono text-xs text-fg-muted truncate'>{record.uri}</span>
          {mappedForCollection ? (
            <Flex column gap='sm'>
              {preview && (
                <ObjectCard.Root>
                  <ObjectCard.Header subject={preview} />
                  <Surface.Surface type={AppSurface.CardContent} data={{ subject: preview }} limit={1} />
                </ObjectCard.Root>
              )}
              {alreadyImported ? (
                <span className='text-sm text-success-text'>{t('imported.label')}</span>
              ) : (
                <Button variant='primary' classNames='self-start' onClick={handleImport}>
                  {t('import.label')}
                </Button>
              )}
            </Flex>
          ) : (
            <JsonHighlighter data={record.value} />
          )}
        </Container>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  ) : null;

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root classNames='px-2'>
          <Icon icon='ph--at--regular' size='md' tone='muted' />
          <Field.Root>
            <Input
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
          </Field.Root>
          <Button onClick={() => setActiveHandle(handleInput.trim() || undefined)}>{t('browse.label')}</Button>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex flex-col dx-grow py-2'>
        {error && <div className='px-2 pb-2 text-sm text-error-text'>{error}</div>}
        <PaneList
          rows={collectionRows}
          selectedId={collection}
          onSelect={setCollection}
          emptyLabel={t('no-collections.label')}
          detail={
            collection ? (
              <PaneList
                rows={recordRows}
                selectedId={recordUri}
                onSelect={setRecordUri}
                emptyLabel={t('no-records.label')}
                detail={recordDetail}
              />
            ) : null
          }
        />
      </Panel.Body>
    </Panel.Root>
  );
};
