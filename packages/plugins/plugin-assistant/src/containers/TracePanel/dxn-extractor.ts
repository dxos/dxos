//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

/**
 * Patterns for extracting DXN references from tool call params/results.
 *
 * Supported formats:
 * - `{ "/": "dxn:..." }` - IPLD-style encoded references
 * - `{ "@dxn": "dxn:..." }` - Alternative format with @dxn key
 * - `@dxn:...` - In-text references (with @ prefix)
 * - `dxn:...` - Plain DXN strings
 */

/**
 * Regex to match DXN strings in various formats.
 * Matches: dxn:kind:part1:part2:...
 */
const DXN_PATTERN = /dxn:[a-zA-Z0-9]+(?::[a-zA-Z0-9@_-]+)+/g;

/**
 * Regex to match @dxn: prefixed references in text.
 */
const AT_DXN_PATTERN = /@(dxn:[a-zA-Z0-9]+(?::[a-zA-Z0-9@_-]+)+)/g;

/**
 * Extracts all DXN references from a string.
 */
export const extractDxnsFromString = (text: string): DXN[] => {
  const dxns: DXN[] = [];
  const seen = new Set<string>();

  // Match @dxn: prefixed references.
  let match;
  while ((match = AT_DXN_PATTERN.exec(text)) !== null) {
    const dxnStr = match[1];
    if (!seen.has(dxnStr)) {
      const dxn = DXN.tryParse(dxnStr);
      if (dxn) {
        dxns.push(dxn);
        seen.add(dxnStr);
      }
    }
  }

  // Match plain dxn: strings.
  while ((match = DXN_PATTERN.exec(text)) !== null) {
    const dxnStr = match[0];
    if (!seen.has(dxnStr)) {
      const dxn = DXN.tryParse(dxnStr);
      if (dxn) {
        dxns.push(dxn);
        seen.add(dxnStr);
      }
    }
  }

  return dxns;
};

/**
 * Extracts DXN references from a JSON object.
 * Handles IPLD-style references `{ "/": "dxn:..." }` and `{ "@dxn": "dxn:..." }`.
 */
export const extractDxnsFromObject = (obj: unknown): DXN[] => {
  const dxns: DXN[] = [];
  const seen = new Set<string>();

  const addDxn = (dxnStr: string) => {
    if (!seen.has(dxnStr)) {
      const dxn = DXN.tryParse(dxnStr);
      if (dxn) {
        dxns.push(dxn);
        seen.add(dxnStr);
      }
    }
  };

  const traverse = (value: unknown): void => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'string') {
      // Check if the string itself is a DXN.
      if (value.startsWith('dxn:')) {
        addDxn(value);
      } else if (value.startsWith('@dxn:')) {
        addDxn(value.slice(1));
      }
      // Also extract DXNs from within the string.
      const extracted = extractDxnsFromString(value);
      for (const dxn of extracted) {
        addDxn(dxn.toString());
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

      // Check for IPLD-style reference: { "/": "dxn:..." }
      if ('/' in record && typeof record['/'] === 'string') {
        const dxnStr = record['/'];
        if (typeof dxnStr === 'string' && dxnStr.startsWith('dxn:')) {
          addDxn(dxnStr);
        }
      }

      // Check for @dxn key: { "@dxn": "dxn:..." }
      if ('@dxn' in record && typeof record['@dxn'] === 'string') {
        const dxnStr = record['@dxn'];
        if (typeof dxnStr === 'string' && dxnStr.startsWith('dxn:')) {
          addDxn(dxnStr);
        }
      }

      // Check for reference blocks: { _tag: 'reference', reference: { dxn: ... } }
      if (record._tag === 'reference' && record.reference && typeof record.reference === 'object') {
        const ref = record.reference as Record<string, unknown>;
        if (ref.dxn && typeof ref.dxn === 'string') {
          addDxn(ref.dxn);
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
export const extractFirstDxnFromToolInput = (input: string): DXN | undefined => {
  try {
    const parsed = JSON.parse(input);
    const dxns = extractDxnsFromObject(parsed);
    return dxns[0];
  } catch {
    // If JSON parsing fails, try to extract from the raw string.
    const dxns = extractDxnsFromString(input);
    return dxns[0];
  }
};

/**
 * Extracts the first DXN from a tool result string (JSON).
 */
export const extractFirstDxnFromToolResult = (result: string | undefined): DXN | undefined => {
  if (!result) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(result);
    const dxns = extractDxnsFromObject(parsed);
    return dxns[0];
  } catch {
    // If JSON parsing fails, try to extract from the raw string.
    const dxns = extractDxnsFromString(result);
    return dxns[0];
  }
};
