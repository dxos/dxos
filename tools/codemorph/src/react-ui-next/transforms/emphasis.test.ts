//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { TEXT_EMPHASIS_RENAMES, createEmphasisTransform, emphasis, renameClasses } from './emphasis.ts';

const TABLE = { 'text-description': 'text-muted', 'text-subdued': 'text-subtle' };

describe('emphasis', () => {
  test('is a no-op while the rename table is empty', () => {
    expect(TEXT_EMPHASIS_RENAMES).toEqual({});
    const input = code`
      export const Text = () => <span className='text-description' />;
    `;
    expect(transformFixture(emphasis, input).output).toBe(input);
  });

  test('renames tokens with variant prefixes and opacity suffixes', () => {
    expect(renameClasses('p-2 text-description hover:text-subdued md:!text-description/50', TABLE)).toBe(
      'p-2 text-muted hover:text-subtle md:!text-muted/50',
    );
    expect(renameClasses('text-descriptions', TABLE)).toBeUndefined();
  });

  test('rewrites class strings anywhere but module specifiers', () => {
    const { output } = transformFixture(
      createEmphasisTransform(TABLE),
      code`
        import { mx } from 'text-description';

        export const Text = () => <span className={mx('text-description', \`text-subdued\`)} />;
      `,
    );
    expect(output).toBe(code`
      import { mx } from 'text-description';

      export const Text = () => <span className={mx('text-muted', \`text-subtle\`)} />;
    `);
  });
});
