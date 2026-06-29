//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { DXN, Database, Ref } from '@dxos/echo';
import { PageAction } from '@dxos/plugin-crx/types';
import { Text } from '@dxos/schema';

import * as Bookmark from './Bookmark';

export const AddFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.plugin.bookmarks.operation.addFromSnapshot'),
    name: 'Add bookmark',
    description: 'Save a web page snapshot as a bookmark.',
    icon: 'ph--bookmark-simple--regular',
  },
  input: Schema.Struct({
    snapshot: PageAction.Snapshot,
    target: Database.Database.annotations({ description: 'The database to add the bookmark to.' }),
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
    key: DXN.make('org.dxos.plugin.bookmarks.operation.summarize'),
    name: 'Summarize Bookmark',
    description: 'Summarizes the bookmarked page and links the summary.',
    icon: 'ph--text-align-left--regular',
  },
  input: Schema.Struct({
    bookmark: Ref.Ref(Bookmark.Bookmark).annotations({ description: 'The bookmark to summarize.' }),
  }),
  output: Schema.Struct({
    summary: Ref.Ref(Text.Text).annotations({ description: 'The generated summary text object.' }),
  }),
  services: [Database.Service, AiService.AiService],
});
