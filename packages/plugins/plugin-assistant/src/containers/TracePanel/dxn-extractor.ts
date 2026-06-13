//
// Copyright 2025 DXOS.org
//

import { URI } from '@dxos/keys';

/**
 * Patterns for extracting references from tool call params/results.
 *
 * Supported formats:
 * - `{ "/": "echo:…" | "dxn:…" }` - IPLD-style encoded references
 * - `{ "@uri": "echo:…" }` - Self URI key
 * - `@echo:…` / `@dxn:…` - In-text references (with @ prefix)
 * - `echo:…` / `dxn:…` - Plain URI strings
 */

/**
 * Regex matching a canonical reference URI: an `echo:` EID or a `dxn:<nsid>[:<version>]` type DXN.
 */
const URI_PATTERN = /(?:echo:\/{1,3}[A-Za-z0-9/]+|dxn:[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9-]+)+(?::\d+\.\d+\.\d+)?)/g;

/**
 * Regex matching an `@`-prefixed reference URI in text.
 */
const AT_URI_PATTERN = new RegExp(`@(${URI_PATTERN.source})`, 'g');

/**
 * Extracts all reference URIs from a string.
 */
export const extractDxnFromString = (text: string): URI.URI[] => {
  const dxns: URI.URI[] = [];
  const seen = new Set<string>();

  const add = (uri: string) => {
    if (!seen.has(uri)) {
      dxns.push(URI.make(uri));
      seen.add(uri);
    }
  };

  // Match @-prefixed references.
  let match;
  while ((match = AT_URI_PATTERN.exec(text)) !== null) {
    add(match[1]);
  }

  // Match plain URI strings.
  while ((match = URI_PATTERN.exec(text)) !== null) {
    add(match[0]);
  }

  return dxns;
};

/**
 * Extracts DXN references from a JSON object.
 * Handles IPLD-style references `{ "/": "dxn:..." }` and `{ "@dxn": "dxn:..." }`.
 */
export const extractDxnsFromObject = (obj: unknown): URI.URI[] => {
  const dxns: URI.URI[] = [];
  const seen = new Set<string>();

  const addDxn = (dxnStr: string) => {
    if (!seen.has(dxnStr)) {
      dxns.push(URI.make(dxnStr));
      seen.add(dxnStr);
    }
  };

  const traverse = (value: unknown): void => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'string') {
      // Check if the string itself is a reference URI.
      if (value.startsWith('echo:') || value.startsWith('dxn:')) {
        addDxn(value);
      } else if (value.startsWith('@echo:') || value.startsWith('@dxn:')) {
        addDxn(value.slice(1));
      }
      // Also extract references from within the string.
      const extracted = extractDxnFromString(value);
      for (const dxn of extracted) {
        addDxn(dxn);
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        traverse(item);
      }
      return;
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;

      // Check for IPLD-style reference: { "/": "echo:…" | "dxn:…" }
      if ('/' in record && typeof record['/'] === 'string') {
        const refStr = record['/'];
        if (typeof refStr === 'string' && (refStr.startsWith('echo:') || refStr.startsWith('dxn:'))) {
          addDxn(refStr);
        }
      }

      // Check for self URI key: { "@uri": "echo:…" }
      const selfUri = record['@uri'];
      if (typeof selfUri === 'string' && (selfUri.startsWith('dxn:') || selfUri.startsWith('echo:'))) {
        addDxn(selfUri);
      }

      // Check for reference blocks: { _tag: 'reference', reference: { uri: ... } }
      if (record._tag === 'reference' && record.reference && typeof record.reference === 'object') {
        const ref = record.reference as Record<string, unknown>;
        const refUri = ref.uri;
        if (typeof refUri === 'string' && (refUri.startsWith('echo:') || refUri.startsWith('dxn:'))) {
          addDxn(refUri);
        }
      }

      // Recursively traverse all properties.
      for (const key of Object.keys(record)) {
        traverse(record[key]);
      }
    }
  };

  traverse(obj);
  return dxns;
};

/**
 * Extracts the first DXN from a tool call input string (JSON).
 */
export const extractFirstDxnFromToolInput = (input: string): URI.URI | undefined => {
  try {
    const parsed = JSON.parse(input);
    const dxns = extractDxnsFromObject(parsed);
    return dxns[0];
  } catch {
    // If JSON parsing fails, try to extract from the raw string.
    const dxns = extractDxnFromString(input);
    return dxns[0];
  }
};

/**
 * Extracts the first DXN from a tool result string (JSON).
 */
export const extractFirstDxnFromToolResult = (result: string | undefined): URI.URI | undefined => {
  if (!result) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(result);
    const dxns = extractDxnsFromObject(parsed);
    return dxns[0];
  } catch {
    // If JSON parsing fails, try to extract from the raw string.
    const dxns = extractDxnFromString(result);
    return dxns[0];
  }
};
