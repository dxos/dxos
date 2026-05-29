//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, JsonSchema, Ref } from '@dxos/echo';

import { meta } from '#meta';

import { Provider, RequestMapping, ResultMapping } from './Provider';
import { Result } from './Result';
import { Search } from './Search';

const SEARCH_OPERATION = `${meta.id}.operation`;

/** Executes one provider template against a search and returns result objects. */
export const RunProviderSearch = Operation.make({
  meta: {
    key: `${SEARCH_OPERATION}.run-provider-search`,
    name: 'Run Provider Search',
    description: 'Executes one provider template against a search and returns result objects.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    search: Ref.Ref(Search),
    provider: Ref.Ref(Provider),
  }),
  output: Schema.Array(Ref.Ref(Result)),
  services: [Database.Service],
});

/** Runs all enabled providers for a search and links the results. */
export const RunSearch = Operation.make({
  meta: {
    key: `${SEARCH_OPERATION}.run-search`,
    name: 'Run Search',
    description: 'Runs all enabled providers for a search and links the results.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({ search: Ref.Ref(Search) }),
  output: Schema.Void,
  services: [Database.Service, Capability.Service],
});

/** Fetches a provider's vendor site so the agent can derive its template. */
export const AnalyzeProvider = Operation.make({
  meta: {
    key: `${SEARCH_OPERATION}.analyze-provider`,
    name: 'Analyze Provider',
    description: "Fetches the provider's vendor site and returns the page source for the agent to inspect.",
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({ provider: Ref.Ref(Provider) }),
  output: Schema.String,
  services: [Database.Service],
});

/** Persists a derived provider template (search schema + request + result mappings). */
export const SetProviderTemplate = Operation.make({
  meta: {
    key: `${SEARCH_OPERATION}.set-provider-template`,
    name: 'Set Provider Template',
    description: 'Persists the derived search schema, request mapping, and result mapping onto a provider.',
    icon: 'ph--floppy-disk--regular',
  },
  input: Schema.Struct({
    provider: Ref.Ref(Provider),
    searchSchema: JsonSchema.JsonSchema,
    request: RequestMapping,
    result: ResultMapping,
  }),
  output: Ref.Ref(Provider),
  services: [Database.Service],
});
