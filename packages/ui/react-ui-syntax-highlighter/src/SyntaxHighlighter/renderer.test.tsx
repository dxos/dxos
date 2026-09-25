//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import PrismLight from 'react-syntax-highlighter/dist/esm/prism-light';
import { coldarkCold, coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { describe, test } from 'vitest';

import { renderRows } from './renderer.ts';

PrismLight.registerLanguage('javascript', javascript);
PrismLight.registerLanguage('json', json);

const SOURCES = {
  javascript: [
    'const greet = async (name) => {',
    '  // Say hello.',
    '  const message = `Hello, ${name}!`;',
    '  return await Promise.resolve({ message, count: 42, ok: true, re: /a+b/g });',
    '};',
  ].join('\n'),
  json: JSON.stringify({ id: 'abc', nested: { list: [1, 2, null], flag: false } }, null, 2),
};

describe('renderRows', () => {
  for (const [name, stylesheet] of Object.entries({ coldarkCold, coldarkDark })) {
    for (const [language, source] of Object.entries(SOURCES)) {
      for (const useInlineStyles of [true, false]) {
        test(`matches the stock renderer (${name}, ${language}, inline=${useInlineStyles})`, ({ expect }) => {
          const render = (renderer?: typeof renderRows) =>
            renderToStaticMarkup(
              <PrismLight
                language={language}
                style={stylesheet}
                useInlineStyles={useInlineStyles}
                renderer={renderer}
                wrapLines={false}
              >
                {source}
              </PrismLight>,
            );

          expect(render(renderRows)).toEqual(render());
        });
      }
    }
  }
});
