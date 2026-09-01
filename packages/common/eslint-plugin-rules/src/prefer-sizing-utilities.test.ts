//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, test } from 'vitest';

import rule from '../rules/prefer-sizing-utilities.js';

const filename = 'Component.tsx';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('prefer-sizing-utilities', () => {
  it('accepts the utilities and unrelated classes', () => {
    ruleTester.run('prefer-sizing-utilities', rule, {
      valid: [
        { filename, code: "<div className='dx-expand' />" },
        { filename, code: "<div className='dx-grow' />" },
        { filename, code: "<div className='dx-fill' />" },
        { filename, code: "<div className='dx-expand grid grid-cols-2' />" },
        // A single sizing class is a deliberate one-axis choice, not a hand-rolled bundle.
        { filename, code: "<div className='min-w-0 truncate' />" },
        { filename, code: "<div className='w-full' />" },
        { filename, code: "<div className='flex-1' />" },
        // A clip alongside a sizing utility is a deliberate choice, not a duplicated constraint.
        { filename, code: "<div className='dx-expand overflow-hidden' />" },
        { filename, code: "<div className='dx-fullscreen overflow-hidden' />" },
        // Not a class-bearing attribute.
        { filename, code: "<div title='h-full w-full' />" },
        // A variant retargets the class, so the pair is not a rule about this element.
        { filename, code: "<div className='[&>svg]:w-full [&>svg]:h-full' />" },
        { filename, code: "<div className='hover:w-full md:h-full' />" },
        { filename, code: "<div className='[&_.dx-grid]:absolute [&_.dx-grid]:inset-0' />" },
      ],
      invalid: [],
    });
  });

  it('reports hand-rolled equivalents', () => {
    ruleTester.run('prefer-sizing-utilities', rule, {
      valid: [],
      invalid: [
        {
          filename,
          code: "<div className='flex-1 min-h-0' />",
          errors: [{ messageId: 'handRolled', data: { classes: 'flex-1 min-h-0', suggestion: 'dx-grow' } }],
        },
        {
          filename,
          code: "<div className='grow min-h-0' />",
          errors: [{ messageId: 'handRolled', data: { classes: 'grow min-h-0', suggestion: 'dx-grow' } }],
        },
        {
          filename,
          code: "<div className='flex-1 min-h-0 min-w-0' />",
          errors: [{ messageId: 'handRolled', data: { classes: 'flex-1 min-h-0 min-w-0', suggestion: 'dx-grow' } }],
        },
        {
          filename,
          code: "<div className='h-full w-full' />",
          errors: [{ messageId: 'handRolled', data: { classes: 'h-full w-full', suggestion: 'dx-fill' } }],
        },
        {
          filename,
          code: "<div className='absolute inset-0' />",
          errors: [{ messageId: 'handRolled', data: { classes: 'absolute inset-0', suggestion: 'dx-fullscreen' } }],
        },
        // The longest match wins, so one class list yields one suggestion rather than a cascade.
        {
          filename,
          code: "<div className='flex-1 min-h-0 min-w-0 h-full w-full' />",
          errors: [
            {
              messageId: 'handRolled',
              data: { classes: 'flex-1 min-h-0 min-w-0 h-full w-full', suggestion: 'dx-expand' },
            },
          ],
        },
        // `classNames` and `mx()` are checked too.
        {
          filename,
          code: "<div classNames={mx('h-full w-full')} />",
          errors: [{ messageId: 'handRolled', data: { classes: 'h-full w-full', suggestion: 'dx-fill' } }],
        },
      ],
    });
  });

  it('reports a minimum that a clip has already applied', () => {
    ruleTester.run('prefer-sizing-utilities', rule, {
      valid: [
        // The element's own overflow stays visible, so the minimum is load-bearing.
        { filename, code: "<div className='min-h-0' />" },
        { filename, code: "<div className='dx-shrink' />" },
        // The clip is on a descendant, not on this element.
        { filename, code: "<div className='min-h-0 [&>*]:overflow-hidden' />" },
        // `overflow-clip` clips without scrolling, so it is not a scroll container and the
        // automatic minimum size still applies — the class stays load-bearing.
        { filename, code: "<div className='min-h-0 overflow-clip' />" },
        { filename, code: "<div className='dx-shrink overflow-x-clip' />" },
      ],
      invalid: [
        {
          filename,
          code: "<div className='min-h-0 overflow-hidden' />",
          errors: [{ messageId: 'minimumUnderClip', data: { minimum: 'min-h-0', overflow: 'overflow-hidden' } }],
        },
        {
          filename,
          code: "<div className='min-w-0 overflow-y-auto' />",
          errors: [{ messageId: 'minimumUnderClip', data: { minimum: 'min-w-0', overflow: 'overflow-y-auto' } }],
        },
        {
          filename,
          code: "<div className='dx-shrink overflow-scroll' />",
          errors: [{ messageId: 'minimumUnderClip', data: { minimum: 'dx-shrink', overflow: 'overflow-scroll' } }],
        },
      ],
    });
  });

  it('reports two utilities that compose into a third', () => {
    ruleTester.run('prefer-sizing-utilities', rule, {
      valid: [],
      invalid: [
        {
          filename,
          code: "<div className='flex dx-fill dx-grow' />",
          errors: [{ messageId: 'handRolled', data: { classes: 'dx-grow dx-fill', suggestion: 'dx-expand' } }],
        },
      ],
    });
  });

  it('reports a utility stacked on what it already applies', () => {
    ruleTester.run('prefer-sizing-utilities', rule, {
      valid: [],
      invalid: [
        {
          filename,
          code: "<div className='dx-expand h-full' />",
          errors: [{ messageId: 'redundant', data: { className: 'dx-expand', redundant: 'h-full' } }],
        },
        {
          filename,
          code: "<div className='dx-grow min-h-0' />",
          errors: [{ messageId: 'redundant', data: { className: 'dx-grow', redundant: 'min-h-0' } }],
        },
        {
          filename,
          code: "<div className='dx-fill w-full' />",
          errors: [{ messageId: 'redundant', data: { className: 'dx-fill', redundant: 'w-full' } }],
        },
      ],
    });
  });
});
