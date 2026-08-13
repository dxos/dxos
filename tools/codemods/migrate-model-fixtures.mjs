//
// Copyright 2026 DXOS.org
//

// Ports the recorded model fixtures from Effect 3 payloads to Effect 4 ones. The fixtures are
// captured provider exchanges, so regenerating them needs live API credentials — the stored payloads
// are migrated in place instead, as the JSON Schema corpus was.
//
// Three independent transforms (the third is defined with its data, below):
//
//  1. `usage` (every suite). v4's `Response.Usage` nests the counters:
//       v3: { inputTokens, outputTokens, totalTokens, cachedInputTokens? }
//       v4: { inputTokens: { uncached?, total?, cacheRead?, cacheWrite? },
//             outputTokens: { total?, text?, reasoning? } }
//     `totalTokens` has no v4 counterpart (it is the sum of the two branches) and is dropped.
//     Applied everywhere because a v3-shaped record cannot decode at all, so leaving one behind
//     only defers the failure.
//
//  2. Tool `inputSchema` (the `ai` suite only). `Tool.getJsonSchema` is Effect's own emitter and its
//     output is part of the request the fixture is keyed on, so v4's emission changes are a key
//     mismatch rather than a decode failure. Scoped deliberately: the rules below are transcribed
//     from v4's actual output for these three tools, and the `ai` suite is the only one whose
//     model-fixture tests run — every other suite skips them, so a store-wide rewrite would be
//     unverifiable invention. Those suites need regenerated fixtures when they are re-enabled.
//
// Usage: node tools/codemods/migrate-model-fixtures.mjs [store-dir]

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? '.store/conversations';

// The suite whose model-fixture tests actually execute; see note 2 above.
const TOOL_SCHEMA_SUITE = 'packages_core_compute_ai_src_testing_model-fixture_LanguageModelFixture';

// 3. Tool-handler error text. A tool whose parameters fail to decode reports the failure back to the
//    model as the tool result, so v4's rewritten error message lands in the next request and changes
//    the fixture key. The text is produced locally (not by the provider), so it is deterministic.
//    Only the replacement below is transcribed from a run; the `assistant-toolkit` fixture carrying
//    the same v3 shape is left alone because its tests skip, leaving no way to verify a rewrite.
const ERROR_TEXT_REPLACEMENTS = [
  {
    suite: 'packages_core_compute_agent-runtime_src_assistant-session-tests_request',
    from:
      'MalformedOutput: { "module": "Toolkit", "method": "Calculator.handle", "description": ' +
      '"Failed to decode tool call parameters for tool \'Calculator\' from:\\n\'{}\'", "cause": ' +
      '{ readonly input: string }\n└─ ["input"]\n   └─ is missing }\ncaused by:\nParseError: ' +
      '{ readonly input: string }\n└─ ["input"]\n   └─ is missing',
    to:
      "effect/ai/AiError/AiError: Toolkit.Calculator.handle: Invalid parameters for tool 'Calculator': " +
      'Missing key\n  at ["input"]\ncaused by:\neffect/ai/AiError/ToolParameterValidationError: ' +
      'Invalid parameters for tool \'Calculator\': Missing key\n  at ["input"]',
  },
];

const jsonFiles = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* jsonFiles(path);
    } else if (entry.name.endsWith('.json')) {
      yield path;
    }
  }
};

/** @returns the v4 usage record, or undefined when `usage` is absent or already migrated. */
const migrateUsage = (usage) => {
  if (usage == null || typeof usage !== 'object' || typeof usage.inputTokens === 'object') {
    return undefined;
  }

  const cacheRead = usage.cachedInputTokens;
  const inputTokens = {};
  if (typeof usage.inputTokens === 'number') {
    inputTokens.total = usage.inputTokens;
    // `uncached` is the non-cached remainder; with no cache figure recorded the total is uncached.
    inputTokens.uncached = usage.inputTokens - (typeof cacheRead === 'number' ? cacheRead : 0);
  }
  if (typeof cacheRead === 'number') {
    inputTokens.cacheRead = cacheRead;
  }

  const outputTokens = {};
  if (typeof usage.outputTokens === 'number') {
    outputTokens.total = usage.outputTokens;
  }

  return { inputTokens, outputTokens };
};

// Refinement keywords v4 lifts into `allOf`, leaving `type` at the property's top level. `description`
// travels with them because it annotates the check, not the base type.
const REFINEMENT_KEYS = ['pattern', 'minLength', 'maxLength', 'minimum', 'maximum', 'format'];

/** @returns the v4 tool input schema, or undefined when nothing changed. */
const migrateToolSchema = (schema) => {
  if (schema == null || typeof schema !== 'object' || schema.type !== 'object') {
    return undefined;
  }

  const properties = schema.properties;
  if (properties == null || typeof properties !== 'object') {
    return undefined;
  }

  // An empty struct emits neither `properties` nor `required`.
  if (Object.keys(properties).length === 0) {
    const { properties: _properties, required: _required, ...rest } = schema;
    return rest;
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  const next = {};
  // An empty `required` is omitted entirely, even alongside properties.
  let changed = Array.isArray(schema.required) && schema.required.length === 0;

  for (const [key, value] of Object.entries(properties)) {
    let property = value;

    if (property != null && typeof property === 'object' && !Array.isArray(property)) {
      const refinements = REFINEMENT_KEYS.filter((keyword) => keyword in property);
      if (refinements.length > 0 && !('allOf' in property)) {
        const lifted = {};
        const base = {};
        for (const [name, entry] of Object.entries(property)) {
          if (refinements.includes(name) || name === 'description') {
            lifted[name] = entry;
          } else {
            base[name] = entry;
          }
        }
        property = { ...base, allOf: [lifted] };
        changed = true;
      }

      // An optional property (absent from `required`) becomes a nullable union.
      if (!required.includes(key) && !('anyOf' in property)) {
        property = { anyOf: [property, { type: 'null' }] };
        changed = true;
      }
    }

    next[key] = property;
  }

  if (!changed) {
    return undefined;
  }

  const migrated = { ...schema, properties: next };
  if (required.length === 0) {
    delete migrated.required;
  }
  return migrated;
};

let usageParts = 0;
let toolSchemas = 0;
let errorTexts = 0;
let changedFiles = 0;
let scanned = 0;

for (const file of jsonFiles(root)) {
  scanned++;
  const document = JSON.parse(readFileSync(file, 'utf8'));
  let changed = false;

  for (const part of document.response ?? []) {
    const usage = migrateUsage(part.usage);
    if (usage) {
      part.usage = usage;
      changed = true;
      usageParts++;
    }
  }

  if (file.includes(TOOL_SCHEMA_SUITE)) {
    for (const tool of document.parameters?.tools ?? []) {
      const inputSchema = migrateToolSchema(tool.inputSchema);
      if (inputSchema) {
        tool.inputSchema = inputSchema;
        changed = true;
        toolSchemas++;
      }
    }
  }

  for (const { suite, from, to } of ERROR_TEXT_REPLACEMENTS) {
    if (!file.includes(suite)) {
      continue;
    }
    for (const message of document.prompt?.content ?? []) {
      for (const part of message.content ?? []) {
        if (part.type === 'tool-result' && part.result === from) {
          part.result = to;
          changed = true;
          errorTexts++;
        }
      }
    }
  }

  if (changed) {
    // The store encodes through `Schema.fromJsonString`, i.e. compact with no trailing newline.
    // Match it so a later regeneration produces no incidental diff.
    writeFileSync(file, JSON.stringify(document));
    changedFiles++;
  }
}

// eslint-disable-next-line no-console
console.log(
  `migrated ${usageParts} usage records, ${toolSchemas} tool schemas and ${errorTexts} error texts across ${changedFiles} fixtures (${scanned} scanned)`,
);
