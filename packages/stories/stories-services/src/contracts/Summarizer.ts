//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import type * as Stream from 'effect/Stream';

import { Service } from '../services/index.ts';

/** Summarizes text through an AI gateway, so only a host that has one can provide this. */
export const Contract = Service.make('org.dxos.stories.services.summarizer', {
  version: '0.1.0',
  methods: {
    summarize: { payload: Schema.Struct({ text: Schema.String }), success: Schema.String, stream: true },
  },
  properties: {
    status: Schema.Literals(['idle', 'busy']),
  },
  events: {
    completed: Schema.Struct({ tokens: Schema.Number }),
  },
});

export type Client = Service.Client<(typeof Contract)['shape']>;

/** The feature a host offers as `aiGateway`: a prompt in, tokens out. */
export type Gateway = {
  readonly complete: (prompt: string) => Stream.Stream<string>;
};

export const GATEWAY_FEATURE = 'aiGateway';
