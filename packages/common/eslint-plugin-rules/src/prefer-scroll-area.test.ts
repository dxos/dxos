//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, test } from 'vitest';

import rule from '../rules/prefer-scroll-area.js';

const fixture = (pkg: string, rel: string) => new URL(`./__fixtures__/${pkg}/src/${rel}`, import.meta.url).pathname;

const consumer = fixture('scroll-area-consumer', 'Component.tsx');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('prefer-scroll-area', () => {
  test('accepts clipping and unrelated classes', () => {
    ruleTester.run('prefer-scroll-area', rule, {
      valid: [
        { filename: consumer, code: "<div className='overflow-hidden' />" },
        { filename: consumer, code: "<div className='overflow-x-clip' />" },
        { filename: consumer, code: "<div className='dx-grow' />" },
        // Not a class-bearing attribute.
        { filename: consumer, code: "<div title='overflow-auto' />" },
        // A variant retargets the class to a descendant or state, not this element.
        { filename: consumer, code: "<div className='[&>pre]:overflow-x-auto' />" },
        { filename: consumer, code: "<div className='md:overflow-y-auto' />" },
      ],
      invalid: [],
    });
  });

  test('reports a raw scroll box', () => {
    ruleTester.run('prefer-scroll-area', rule, {
      valid: [],
      invalid: [
        {
          filename: consumer,
          code: "<div className='flex flex-col overflow-y-auto' />",
          errors: [{ messageId: 'rawScroll', data: { className: 'overflow-y-auto' } }],
        },
        {
          filename: consumer,
          code: "<div className='overflow-auto' />",
          errors: [{ messageId: 'rawScroll', data: { className: 'overflow-auto' } }],
        },
        {
          filename: consumer,
          code: "<div className='overflow-x-scroll' />",
          errors: [{ messageId: 'rawScroll', data: { className: 'overflow-x-scroll' } }],
        },
        // `classNames`, ternaries and `mx()` are checked too, each literal once.
        {
          filename: consumer,
          code: "<Panel classNames={mx('p-2', scroll ? 'overflow-y-auto' : 'overflow-hidden')} />",
          errors: [{ messageId: 'rawScroll', data: { className: 'overflow-y-auto' } }],
        },
      ],
    });
  });

  test('skips packages without @dxos/react-ui, the implementation, and allowed files', () => {
    ruleTester.run('prefer-scroll-area', rule, {
      valid: [
        { filename: fixture('scroll-area-other', 'Component.tsx'), code: "<div className='overflow-auto' />" },
        {
          filename: fixture('scroll-area-react-ui', 'next/components/ScrollArea/ScrollArea.tsx'),
          code: "<div className='overflow-auto' />",
        },
        {
          filename: consumer,
          code: "<div className='overflow-auto' />",
          options: [{ allow: ['scroll-area-consumer/src/Component.tsx'] }],
        },
      ],
      invalid: [
        // The exemption covers the ScrollArea implementation, not the rest of `@dxos/react-ui`.
        {
          filename: fixture('scroll-area-react-ui', 'testing/Loading.tsx'),
          code: "<div className='overflow-auto' />",
          errors: [{ messageId: 'rawScroll', data: { className: 'overflow-auto' } }],
        },
      ],
    });
  });
});
