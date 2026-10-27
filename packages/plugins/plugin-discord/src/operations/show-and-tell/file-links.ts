//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query } from '@dxos/echo';

import { ShowAndTell, ShowAndTellOperation } from '#types';

import { categorize, mergeShared, titleFromLink } from './curate.ts';

const handler: Operation.WithHandler<typeof ShowAndTellOperation.FileLinks> = ShowAndTellOperation.FileLinks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ author, text, links, postedAt, messageId, channelId, messageLink }) {
      const shared = mergeShared(text, links, { messageLink });
      const date = postedAt ?? new Date().toISOString();
      const filed: ShowAndTellOperation.FiledEntry[] = [];
      let skipped = 0;
      for (const { url, title, category, summary } of shared) {
        const key = ShowAndTell.entryKey({ messageId, link: url });
        const existing = yield* Database.query(Query.select(Filter.foreignKeys(ShowAndTell.Entry, [key]))).run;
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        const entry = yield* Database.add(
          ShowAndTell.make({
            date,
            author,
            link: url,
            title: title ?? titleFromLink(url),
            category: category ?? categorize(url),
            summary: summary ?? '',
            ...(messageId ? { messageId } : {}),
            ...(channelId ? { channelId } : {}),
          }),
        );
        filed.push({ link: entry.link, title: entry.title, category: entry.category, summary: entry.summary });
      }
      return { filed, skipped };
    }),
  ),
);

export default handler;
