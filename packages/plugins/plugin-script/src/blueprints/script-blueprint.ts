//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import {
  Create,
  Read,
  Update,
  Delete,
  Deploy,
  Invoke,
  InspectInvocations,
  QueryDeployedFunctions,
  InstallFunction,
} from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.script';

const AVAILABLE_PACKAGES = trim`
  Scripts run in an Edge runtime (Cloudflare Workers) with the following pre-bundled packages:

  DXOS SDK:
  - \`@dxos/echo\` — Reactive local-first database: query, filter, and mutate ECHO objects in spaces.
  - \`@dxos/functions\` — Edge function framework: triggers, queues, and function definitions.
  - \`@dxos/ai\` — AI/LLM integration via AiService (access models like Claude, GPT).
  - \`@dxos/schema\` — Schema utilities and built-in DXOS types.
  - \`@dxos/types\` — DXOS type definitions.
  - \`@dxos/operation\` — Define and handle typed operations with input/output schemas.
  - \`@dxos/util\` — General utility functions.
  - \`@dxos/log\` — Structured logging.

  Effect-TS (functional programming toolkit):
  - \`effect\` — Core effect system with sub-modules: Effect, Schema, Stream, Schedule, Array, Record, Option, Either, Match, etc.
  - \`@effect/platform\` — HTTP client (\`HttpClient\`), platform abstractions for making typed API requests.

  Data format parsing & querying:
  - \`jsonata\` — Powerful query and transformation expressions for JSON data (filter, sort, group, aggregate, reshape).
  - \`yaml\` — Parse and stringify YAML documents.
  - \`fast-xml-parser\` — Fast XML parser and builder; convert between XML and JSON.
  - \`papaparse\` — CSV parsing and serialization; stream large files, auto-detect delimiters.

  Text & markup processing:
  - \`turndown\` — HTML to Markdown converter (useful for feeding web content to LLMs).

  HTML/DOM parsing:
  - \`linkedom\` — Lightweight DOM parser for worker environments; parse and query HTML documents.

  Data processing & utilities:
  - \`date-fns\` — Comprehensive date utility library: parsing, formatting, comparison, arithmetic, time zones.

  Other:
  - \`@automerge/automerge\` — CRDT library for conflict-free collaborative data structures.
  - \`chess.js\` — Chess game logic, move generation, and validation.
`;

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Script',
    tools: Blueprint.toolDefinitions({
      operations: [
        Create,
        Read,
        Update,
        Delete,
        Deploy,
        Invoke,
        InspectInvocations,
        QueryDeployedFunctions,
        InstallFunction,
      ],
    }),
    instructions: Template.make({
      source: trim`
        You can create, read, update, and delete scripts which contain TypeScript code.
        You can deploy scripts to the Edge runtime and invoke deployed scripts.
        You can inspect the invocation history of a deployed script.
        You can query all functions deployed to the EDGE runtime and install them into the current space.

        ${AVAILABLE_PACKAGES}
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
