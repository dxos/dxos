//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { classnames } from './classnames.ts';

describe('classnames', () => {
  test('Icon colour, tone, spin and shrink-0', () => {
    const { output } = transformFixture(
      classnames,
      code`
        import { Icon } from '@dxos/react-ui';

        export const Icons = () => (
          <>
            <Icon icon='ph--check--regular' classNames='text-success-text' />
            <Icon icon='ph--plugs--regular' classNames='shrink-0 text-subdued' />
            <Icon icon='ph--spinner--regular' classNames='animate-spin mr-2' />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Icon } from '@dxos/react-ui';

      export const Icons = () => (
        <>
          <Icon icon='ph--check--regular' valence='success' />
          <Icon icon='ph--plugs--regular' tone='subdued' />
          <Icon icon='ph--spinner--regular' classNames='mr-2' spin />
        </>
      );
    `);
  });

  test('text parts, mono input, span and document width', () => {
    const { output } = transformFixture(
      classnames,
      code`
        import { Card, Field, Panel } from '@dxos/react-ui';

        export const Parts = () => (
          <Panel.Root classNames='dx-document'>
            <Card.Title classNames='line-clamp-2'>Title</Card.Title>
            <Card.Text classNames='truncate text-description'>Text</Card.Text>
            <Field.Root classNames='col-span-2'>
              <Field.Input classNames={['font-mono tabular-nums', className]} />
            </Field.Root>
          </Panel.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Card, Field, Panel } from '@dxos/react-ui';

      export const Parts = () => (
        <Panel.Root width='document'>
          <Card.Title lines={2}>Title</Card.Title>
          <Card.Text truncate variant='description'>Text</Card.Text>
          <Field.Root span={2}>
            <Field.Input classNames={[className]} variant='mono' />
          </Field.Root>
        </Panel.Root>
      );
    `);
  });

  test('conflicts, computed values and unsupported hosts are reported', () => {
    const { output, residue } = transformFixture(
      classnames,
      code`
        import { Icon, Toolbar } from '@dxos/react-ui';

        export const Rest = ({ busy }: { busy: boolean }) => (
          <>
            <Icon icon='ph--x--regular' valence='error' classNames='text-success-text' />
            <Icon icon='ph--x--regular' classNames={mx(busy && 'animate-spin', 'shrink-0')} />
            <Toolbar.Root classNames='dx-document border-b' />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Icon, Toolbar } from '@dxos/react-ui';

      export const Rest = ({ busy }: { busy: boolean }) => (
        <>
          <Icon icon='ph--x--regular' valence='error' classNames='text-success-text' />
          <Icon icon='ph--x--regular' classNames={mx(busy && 'animate-spin')} />
          <Toolbar.Root classNames='dx-document border-b' />
        </>
      );
    `);
    expect(residue).toEqual([
      'text-success-text on Icon: valence is already set',
      'animate-spin on Icon inside a computed classNames',
      'dx-document on Toolbar.Root: the prop exists only on other hosts',
    ]);
  });
});
