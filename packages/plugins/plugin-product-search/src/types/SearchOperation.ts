//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';

import { meta } from '#meta';

import { Provider } from './Provider';
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

/** Analyzes a vendor site and produces a provider template. */
export const AnalyzeProvider = Operation.make({
  meta: {
    key: `${SEARCH_OPERATION}.analyze-provider`,
    name: 'Analyze Provider',
    description:
      'Analyzes a vendor site and produces a provider template (search schema + request + result mappings).',
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({ provider: Ref.Ref(Provider) }),
  output: Ref.Ref(Provider),
  services: [Database.Service, Capability.Service],
});
