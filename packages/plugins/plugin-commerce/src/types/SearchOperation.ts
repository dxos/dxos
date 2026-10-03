//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { Provider, RequestMapping, ResultMapping } from './Provider.ts';
import { Search } from './Search.ts';

/**
 * Fetches a page's HTML, rendering via the composer-crx extension when available. Hosted by the
 * plugin (main thread), it is the render bridge: scrape fetches inside the agent spawn (which has no
 * DOM, so cannot drive the extension) invoke this so the render happens where the extension lives.
 */
export const RenderPage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.commerce.renderPage'),
    name: 'Render Page',
    description: 'Fetches a page, rendering it via the browser extension when available.',
    icon: 'ph--browser--regular',
  },
  input: Schema.Struct({
    url: Schema.String,
    waitForSelector: Schema.optional(Schema.String),
    // Render in a focused (foreground) tab — helps sites that gate background tabs (anti-bot).
    active: Schema.optional(Schema.Boolean),
  }),
  output: Schema.String,
});

/** Executes one provider template against a search and returns result objects. */
export const RunProviderSearch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.commerce.runProviderSearch'),
    name: 'Run Provider Search',
    description: 'Executes one provider template against a search, appending new results to its feed.',
    icon: 'ph--play--regular',
  },
  input: Schema.Struct({
    search: Ref.Ref(Search),
    provider: Ref.Ref(Provider),
  }),
  // Count of newly-appended (previously unseen) results.
  output: Schema.Number,
  services: [Database.Service],
});

/** Runs all enabled providers for a search and links the results. */
export const RunSearch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.commerce.runSearch'),
    name: 'Run Search',
    description: 'Runs all enabled providers for a search and links the results.',
    icon: 'ph--shopping-cart--regular',
  },
  input: Schema.Struct({ search: Ref.Ref(Search) }),
  output: Schema.Void,
  services: [Database.Service, Capability.Service],
});

/** Fetches a provider's vendor site so the agent can derive its template. */
export const AnalyzeProvider = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.commerce.analyzeProvider'),
    name: 'Analyze Provider',
    description: "Fetches the provider's vendor site and returns the page source for the agent to inspect.",
    icon: 'ph--brain--regular',
  },
  input: Schema.Struct({ provider: Ref.Ref(Provider) }),
  output: Schema.String,
  services: [Database.Service],
});

/** Runs the provider skill agent to analyze the site and populate the search template. */
export const GenerateProviderTemplate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.commerce.generateProviderTemplate'),
    name: 'Generate Provider Template',
    description: 'Runs the provider skill agent to analyze the site and populate the search template.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({ provider: Ref.Ref(Provider) }),
  output: Ref.Ref(Provider),
  services: [Database.Service, Capability.Service],
});

/** Persists a derived provider template (search schema + request + result mappings). */
export const SetProviderTemplate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.commerce.setProviderTemplate'),
    name: 'Set Provider Template',
    description: 'Persists the derived search schema, request mapping, and result mapping onto a provider.',
    icon: 'ph--floppy-disk--regular',
  },
  input: Schema.Struct({
    provider: Ref.Ref(Provider),
    // Passed as a JSON string (a JSON Schema draft 2020-12 object). Modelling the recursive
    // JSONSchema meta-type directly produces a tool input_schema the LLM provider rejects.
    searchSchema: Schema.String.annotate({
      description: 'The typed search fields as a JSON Schema (draft 2020-12) object, serialized to a JSON string.',
    }),
    request: RequestMapping,
    result: ResultMapping,
  }),
  output: Ref.Ref(Provider),
  services: [Database.Service],
});
