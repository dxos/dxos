//
// Copyright 2026 DXOS.org
//

import { waitFor } from 'storybook/test';

/** One slide's markdown: a frontmatter block from `frontmatter`, then `body` lines. */
export const slide = (frontmatter: Record<string, string | number>, ...body: string[]) =>
  [
    '---',
    ...Object.entries(frontmatter).map(
      ([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`,
    ),
    '---',
    '',
    ...body,
  ].join('\n');

/** The first element matching `selector`, once the story has rendered it. */
export const query = (canvasElement: HTMLElement, selector: string, timeout = 1_000) =>
  waitFor(
    () => {
      const element = canvasElement.querySelector(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    },
    { timeout },
  );
