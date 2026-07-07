//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type ContentBlock, Transcript } from '@dxos/types';

import { makeEchoCommit } from './dispatch';
import { StageWrite } from './Stage';

describe('makeEchoCommit', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('applies block patches to the window and summary to the transcript', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Transcript.Transcript, Feed.Feed] });
    const feed = db.add(Feed.make());
    const transcript = db.add(Transcript.make(Ref.make(feed)));
    const commit = makeEchoCommit(transcript);

    const block: ContentBlock.Transcript = { _tag: 'transcript', started: 's', text: 'hi there' };
    await EffectEx.runPromise(commit(StageWrite.blocks([{ index: 0, corrected: 'Hi there.' }]), [block]));
    expect(block.corrected).toEqual('Hi there.');

    await EffectEx.runPromise(commit(StageWrite.transcript({ summary: 'A short summary.' }), []));
    expect(transcript.summary).toEqual('A short summary.');
  });
});
