//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import * as PageAction from '@dxos/plugin-crx/PageAction';
import { Text } from '@dxos/schema';

import * as Bookmark from './Bookmark.ts';

export const AddFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.bookmarks.addFromSnapshot'),
    name: 'Add bookmark',
    description: 'Save a web page snapshot as a bookmark.',
    icon: 'ph--bookmark-simple--regular',
  },
  input: Schema.Struct({
    snapshot: PageAction.Snapshot,
    target: Database.Database.annotate({ description: 'The database to add the bookmark to.' }),
  }),
  output: Schema.Struct({
    id: Schema.String,
  }),
});

/**
 * Summarize a bookmarked page via the assistant AI stack and link the resulting summary
 * text object back to the bookmark.
 */
export const Summarize = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.bookmarks.summarize'),
    name: 'Summarize Bookmark',
    description: 'Summarizes the bookmarked page and links the summary.',
    icon: 'ph--text-align-left--regular',
  },
  input: Schema.Struct({
    bookmark: Ref.Ref(Bookmark.Bookmark).annotate({ description: 'The bookmark to summarize.' }),
  }),
  output: Schema.Struct({
    summary: Ref.Ref(Text.Text).annotate({ description: 'The generated summary text object.' }),
  }),
  services: [Database.Service, AiService.AiService],
});
