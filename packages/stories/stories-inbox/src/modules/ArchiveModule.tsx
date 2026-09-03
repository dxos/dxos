//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Order, Query, Tag } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { type EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { IconButton, Panel, SystemIconButton, Toolbar } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { TagIndex } from '@dxos/schema';
import { type ContentBlock, Message } from '@dxos/types';
import { downloadBlob } from '@dxos/util';

import { exportFeedMessages, importMessages, resetMailbox } from '../testing';

/** Stable fallback so the starred-ids atom stays unconditional while the tag index resolves. */
const NO_STARRED_IDS = Atom.make<readonly EntityId[]>(() => []);

/** The message's raw email HTML, or undefined for a markdown/plaintext-only body. */
const getMessageHtml = (message: Message.Message): string | undefined =>
  message.blocks
    .filter((block): block is ContentBlock.Text => block._tag === 'text')
    .find((block) => block.mimeType === 'text/html')?.text;

/**
 * Capture-time stamp matching the fixture tooling's version format (`20260804-185124`), so the
 * downloaded file carries the moment the mailbox was captured and `moon run fixtures:push` adopts
 * it verbatim — the archive keeps one identity on disk and in R2 rather than gaining an unrelated
 * upload time.
 */
const timestamp = (): string => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

/** Archive filename for the whole mailbox: `<asset>-<version>.json`, the shape `push` parses. */
const archiveFilename = (): string => `mailbox-${timestamp()}.json`;

/** Filesystem-safe fixture name derived from the sender and date, e.g. `2026-07-30-alex-example-com`. */
const getFixtureName = (message: Message.Message): string => {
  const date = (message.created ?? '').slice(0, 10);
  const sender = (message.sender?.email ?? message.sender?.name ?? 'unknown').toLowerCase();
  return [date, sender.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')].filter(Boolean).join('-');
};

/**
 * Download the mailbox feed to a local JSON file, replace it from one, or reset it. The exported
 * file is for local development testing only and is never committed. Upload and reset both swap the
 * mailbox's backing feed for a fresh one (seeded from the file, or empty) and delete the previous
 * feed; reset additionally removes the sync binding(s) and every saved Connection (with its
 * AccessToken) so the mailbox returns to a fully disconnected, clean-slate state — otherwise
 * disconnected Connection accounts accumulate in the Connect menu across reconnects.
 */
export const ArchiveModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <ArchiveModuleContainer space={space} />;
};

const ArchiveModuleContainer = ({ space }: { space: Space }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const [status, setStatus] = useState<{ action: string; count: number } | undefined>();
  const [busy, setBusy] = useState(false);

  // The message selected in the Mailbox panel — read under the mailbox object's context, matching
  // `MessageModule` (sibling `ModuleContainer` cells have independent attention targets).
  const messages = useQuery(
    space.db,
    feed
      ? Query.select(Filter.type(Message.Message)).from(feed).orderBy(Order.property('created', 'desc'))
      : Query.select(Filter.nothing()),
  );
  const selectedId = useSelection(mailbox ? GraphPath.getObjectPathFromObject(mailbox) : undefined, 'single');
  const selected = messages.find((candidate) => candidate.id === selectedId);
  const selectedHtml = selected && getMessageHtml(selected);

  // Starring is how a fixture is nominated: the archive exports exactly the starred messages, so the
  // user curates a set in the Mailbox panel rather than downloading (and later re-importing) the feed.
  // Membership is read from the tag index's reverse lookup — a per-message `getTagsForMessage` scan
  // would walk the whole feed on every render of this panel, including every selection change.
  const starredTag = useQuery(space.db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey('starred')]))[0];
  const tagIndex = mailbox?.tags?.target;
  const starredIdsAtom = useMemo(
    () => (tagIndex && starredTag ? TagIndex.taggedIdsAtom(tagIndex, Mailbox.tagUri(starredTag)) : NO_STARRED_IDS),
    [tagIndex, starredTag],
  );
  const starredIds = useAtomValue(starredIdsAtom);
  const isStarred = useCallback((message: Message.Message) => starredIds.includes(message.id), [starredIds]);

  const handleDownload = useCallback(async (): Promise<Blob | null> => {
    if (!feed) {
      return null;
    }

    const serialized = await exportFeedMessages(feed, space.db, isStarred);
    setStatus({ action: 'downloaded starred', count: serialized.length });
    return new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
  }, [feed, space.db, isStarred]);

  // The whole feed, unfiltered: starring curates a fixture, but capturing a corpus (volume,
  // bulk-mail headers, senders the extraction gate rejects) means taking the mailbox as it is.
  const handleDownloadAll = useCallback(async (): Promise<void> => {
    if (!feed) {
      return;
    }

    setBusy(true);
    try {
      const serialized = await exportFeedMessages(feed, space.db);
      void downloadBlob(
        new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' }),
        archiveFilename(),
      );
      setStatus({ action: 'downloaded all', count: serialized.length });
    } catch (error) {
      log.warn('feed export failed', { error });
      setStatus({ action: `export failed: ${error instanceof Error ? error.message : String(error)}`, count: 0 });
    } finally {
      setBusy(false);
    }
  }, [feed, space.db]);

  // Saves the selected message as a single fixture: its raw email HTML when it has an html body (what
  // the HtmlViewer work needs), else the serialized message so a markdown/plaintext body is still
  // capturable.
  const handleDownloadMessage = useCallback((): void => {
    if (!selected) {
      return;
    }

    const blob = selectedHtml
      ? new Blob([selectedHtml], { type: 'text/html' })
      : new Blob([JSON.stringify(Obj.toJSON(selected), null, 2)], { type: 'application/json' });
    void downloadBlob(blob, `${getFixtureName(selected)}.${selectedHtml ? 'html' : 'json'}`);
    setStatus({ action: selectedHtml ? 'saved message html' : 'saved message json', count: 1 });
  }, [selected, selectedHtml]);

  const handleUpload = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!mailbox || !file) {
        return;
      }

      setBusy(true);
      try {
        const serialized: unknown = JSON.parse(await file.text());
        if (!Array.isArray(serialized)) {
          throw new TypeError('Mailbox feed archive must contain an array.');
        }
        const count = await importMessages(mailbox, serialized, space.db);
        setStatus({ action: 'uploaded', count });
      } catch (error) {
        log.warn('feed import failed', { error });
        setStatus({ action: `import failed: ${error instanceof Error ? error.message : String(error)}`, count: 0 });
      } finally {
        setBusy(false);
      }
    },
    [mailbox, space.db],
  );

  const handleReset = useCallback(async () => {
    if (!mailbox) {
      return;
    }

    setBusy(true);
    try {
      await resetMailbox(mailbox, space.db);
      setStatus({ action: 'reset', count: 0 });
    } catch (error) {
      log.warn('feed reset failed', { error });
    } finally {
      setBusy(false);
    }
  }, [mailbox, space.db]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <SystemIconButton.Upload
            iconOnly
            label='Import messages (appends)'
            accept='application/json,.json'
            disabled={!mailbox || busy}
            onFileChange={handleUpload}
          />
          <SystemIconButton.Download
            iconOnly
            label={`Download starred (${starredIds.length})`}
            filename={archiveFilename()}
            disabled={!feed || busy || starredIds.length === 0}
            onDownload={handleDownload}
          />
          <IconButton
            iconOnly
            icon='ph--tray-arrow-down--regular'
            label={`Download all (${messages.length})`}
            disabled={!feed || busy || messages.length === 0}
            onClick={() => void handleDownloadAll()}
          />
          {/* Not `SystemIconButton.Download`: it fixes its own glyph, which would make this visually
              identical to the feed export beside it. */}
          <IconButton
            iconOnly
            icon='ph--envelope-simple--regular'
            label={selected ? `Save message (${selectedHtml ? 'html' : 'json'})` : 'Save message — select one first'}
            disabled={!selected || busy}
            onClick={handleDownloadMessage}
          />
          <Toolbar.Separator />
          <IconButton
            iconOnly
            icon='ph--trash--regular'
            label='Reset'
            disabled={!mailbox || busy}
            onClick={() => void handleReset()}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col gap-2 p-2 text-sm'>
        <JsonHighlighter data={{ feed: feed?.id, ...status }} />
      </Panel.Content>
    </Panel.Root>
  );
};
