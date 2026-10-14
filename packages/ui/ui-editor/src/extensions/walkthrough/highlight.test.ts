//
// Copyright 2026 DXOS.org
//

import { classHighlighter } from '@lezer/highlight';
import { describe, test } from 'vitest';

import { highlightLines } from './highlight.ts';

/** The class list of each highlighted token in a line, keyed by its text. */
const tokens = (fragment: DocumentFragment | undefined): Record<string, string> =>
  Object.fromEntries(
    [...(fragment?.childNodes ?? [])]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((element) => [element.textContent ?? '', element.className]),
  );

describe('highlightLines', () => {
  test('reads a chunk inside the declaration its hunk header names', async ({ expect }) => {
    const code = ['  model?: string;', '  target?: McpTarget;'].join('\n');

    const bare = await highlightLines(code, 'typescript', undefined, classHighlighter);
    const inContext = await highlightLines(
      code,
      'typescript',
      'export type ClaudeHarnessOptions = {',
      classHighlighter,
    );

    // Out of context the member parses as a bare statement; inside the type it is a property.
    expect(tokens(bare?.[0]).model).not.toContain('tok-propertyName');
    expect(inContext).toHaveLength(2);
    expect(tokens(inContext?.[0]).model).toContain('tok-propertyName');
    expect(tokens(inContext?.[0]).string).toContain('tok-typeName');
    expect(tokens(inContext?.[1]).McpTarget).toContain('tok-typeName');
  });

  test('leaves an unknown language to the caller', async ({ expect }) => {
    expect(await highlightLines('x', 'no-such-language')).toBeUndefined();
  });
});
