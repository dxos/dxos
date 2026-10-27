//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter } from '@dxos/echo';

import { ShowAndTell, ShowAndTellOperation } from '#types';

import { type Row, digest, inRange, periodRange } from './curate.ts';

const handler: Operation.WithHandler<typeof ShowAndTellOperation.ListLinks> = ShowAndTellOperation.ListLinks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ period = 'this-week', author, category }) {
      const range = periodRange(period, new Date());
      const handle = (name: string) => name.replace(/^@/, '').toLowerCase();
      const entries: Row[] = (yield* Database.query(Filter.type(ShowAndTell.Entry)).run)
        .filter((entry) => inRange(entry.date, range))
        .filter((entry) => author === undefined || handle(entry.author) === handle(author))
        .filter((entry) => category === undefined || entry.category === category)
        .map((entry) => ({
          date: entry.date,
          author: entry.author,
          link: entry.link,
          title: entry.title,
          category: entry.category,
          summary: entry.summary,
        }))
        .sort((left, right) => Date.parse(left.date) - Date.parse(right.date));
      return { ...range, entries, digest: digest(entries) };
    }),
  ),
);

export default handler;
