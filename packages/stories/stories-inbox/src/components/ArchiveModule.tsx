//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Filter, Query } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { SyncBinding } from '@dxos/plugin-connector';
import { Mailbox } from '@dxos/plugin-inbox';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Panel, SystemIconButton, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { type ModuleProps, exportFeedMessages, replaceFeed } from '../testing';

/**
 * Download the mailbox feed to a local JSON file, replace it from one, or reset it. The exported
 * file is for local development testing only and is never committed. Upload and reset both swap the
 * mailbox's backing feed for a fresh one (seeded from the file, or empty) and delete the previous
 * feed; reset additionally removes the sync binding so the mailbox returns to a disconnected state.
 */
export const ArchiveModule = ({ space }: ModuleProps) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const [status, setStatus] = useState<{ action: string; count: number } | undefined>();
  const [busy, setBusy] = useState(false);

  const handleDownload = useCallback(async (): Promise<Blob | null> => {
    if (!feed) {
      return null;
    }

    const serialized = await exportFeedMessages(feed, space.db);
    setStatus({ action: 'downloaded', count: serialized.length });
    return new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
  }, [feed, space.db]);

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
        const count = await replaceFeed(mailbox, serialized, space.db);
        setStatus({ action: 'uploaded', count });
      } catch (error) {
        log.warn('feed upload failed', { error });
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
      // Remove the sync binding(s) targeting the mailbox so reset returns it to a fully
      // disconnected state (a fresh sync would otherwise resume against the emptied feed).
      const bindings = await space.db
        .query(Query.select(Filter.id(mailbox.id)).targetOf(SyncBinding.SyncBinding))
        .run();
      bindings.filter(SyncBinding.instanceOf).forEach((binding) => space.db.remove(binding));

      await replaceFeed(mailbox, [], space.db);
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
          <SystemIconButton.Download
            iconOnly
            label='Download feed'
            filename='mailbox-feed.json'
            disabled={!feed || busy}
            onDownload={handleDownload}
          />
          <SystemIconButton.Upload
            iconOnly
            label='Upload feed'
            accept='application/json,.json'
            disabled={!mailbox || busy}
            onFileChange={handleUpload}
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
      <Panel.Content className='flex flex-col gap-2 p-2 text-sm'>
        <JsonHighlighter data={{ feed: feed?.id, ...status }} />
      </Panel.Content>
    </Panel.Root>
  );
};
