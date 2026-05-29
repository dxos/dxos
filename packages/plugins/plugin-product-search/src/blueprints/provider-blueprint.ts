//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Provider, SearchOperation } from '../types';

const operations = [SearchOperation.AnalyzeProvider, SearchOperation.SetProviderTemplate];

const make = () =>
  Blueprint.make({
    key: Provider.BLUEPRINT_KEY,
    name: 'Product Search Provider Builder',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You build search templates for vendor websites (retail, cars, real estate, etc.).
        A template has three parts that you persist together: a typed search schema, an HTTP
        request mapping, and a result mapping.

        Workflow:
        1. Call analyzeProvider with the Provider's ref to fetch the vendor site's page source.
        2. Inspect the source to understand how the site exposes search and lists results.
        3. Derive the search schema as a JSONSchema object whose properties are the typed search
           fields the user can fill in (string / number / boolean). Express ranges (e.g. min/max
           price, year) as separate number properties annotated accordingly.
        4. Derive the request mapping: prefer a formal API endpoint if one is discoverable;
           otherwise use the site's search URL with query parameters. Bind each request parameter
           to a search-schema field (use the 'min' / 'max' transform hints for range fields).
        5. Derive the result mapping: choose responseType ('html' or 'json'), an itemLocator that
           selects each listing, and per-field extractors for title, url, price, and image
           (CSS selector + attribute for html, JSONPath for json).
        6. Call setProviderTemplate with the Provider's ref and the derived searchSchema, request,
           and result to persist the template.

        Be conservative: only include fields and selectors you can justify from the page source.
      `,
    }),
  });

const blueprint: Blueprint.Definition = { key: Provider.BLUEPRINT_KEY, make };

export default blueprint;
