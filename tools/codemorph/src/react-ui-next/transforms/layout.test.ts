//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { layout } from './layout.ts';

describe('layout', () => {
  test('a static Flex column becomes a gutterless Container', () => {
    const { output, residue } = transformFixture(
      layout,
      code`
        import { Flex, useTranslation } from '@dxos/react-ui';

        export const Stack = ({ items }: { items: string[] }) => (
          <Flex column gap='sm' role='list'>
            <span className='truncate'>Title</span>
            {items.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </Flex>
        );
      `,
    );
    expect(output).toBe(code`
      import { useTranslation } from '@dxos/react-ui';
      import { Next } from '@dxos/react-ui/next';

      export const Stack = ({ items }: { items: string[] }) => (
        <Next.Container gap='md' role='list' gutter='none'>
          <span className='truncate'>Title</span>
          {items.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </Next.Container>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('what is not converted', () => {
    const input = code`
      import { Flex } from '@dxos/react-ui';

      export const Rest = ({ children, gap }: { children: any; gap: any }) => (
        <>
          <Flex gap='sm'>row</Flex>
          <Flex column classNames='p-2'>classes</Flex>
          <Flex column gap={gap}>computed gap</Flex>
          <Flex column align='center'>centred</Flex>
          <Flex column gap='lg'>wide gap</Flex>
          <Flex column>{children}</Flex>
          <Flex column>
            <div className='flex-1'>grows</div>
          </Flex>
          <Flex column>
            <div className={mx('p-2', active && 'grow')}>computed</div>
          </Flex>
        </>
      );
    `;
    const { output, residue } = transformFixture(layout, input);
    expect(output).toBe(input);
    expect(residue).toEqual([
      'Flex not converted: a row (Group pads and wraps, a Container row needs columns)',
      'Flex not converted: classNames (layout classes need a person)',
      'Flex not converted: a computed layout prop',
      'Flex not converted: align or justify other than the grid default',
      "Flex not converted: gap='lg' has no Container step",
      'Flex not converted: a child is a computed value',
      'Flex not converted: a child has flex-1',
      'Flex not converted: a child has computed classes',
    ]);
  });

  test('Column.Root with Center children becomes a gutter Container', () => {
    const { output, residue } = transformFixture(
      layout,
      code`
        import { Column } from '@dxos/react-ui';

        export const Page = () => (
          <Column.Root gutter='md' gap='sm'>
            <Column.Center>
              <h1>Title</h1>
            </Column.Center>
            <Column.Center classNames='text-sm'>
              <p>One</p>
              <p>Two</p>
            </Column.Center>
          </Column.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Page = () => (
        <Next.Container gap='sm' gutter='md'>
            <h1>Title</h1>
          <div className='text-sm'>
            <p>One</p>
            <p>Two</p>
          </div>
        </Next.Container>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('Column.Root with other children stays', () => {
    const input = code`
      import { Column } from '@dxos/react-ui';

      export const Page = () => (
        <Column.Root>
          <div>in a gutter track</div>
          <Column.Row>row</Column.Row>
        </Column.Root>
      );
    `;
    const { output, residue } = transformFixture(layout, input);
    expect(output).toBe(input);
    expect(residue).toEqual([
      'Column.Root not converted: a child other than Column.Center / Column.Row (Column places it in a gutter track)',
      'Column.Row → a row Container with Block rails, by hand',
    ]);
  });

  test('a static, centred, non-growing Grid becomes a row Container with columns', () => {
    const { output, residue } = transformFixture(
      layout,
      code`
        import { Grid } from '@dxos/react-ui';

        export const Rows = () => (
          <>
            <Grid cols={['10rem', 1, 'min-content']} grow={false} align='center' gap='sm' data-testid='rows'>
              <span>A</span>
              <span>B</span>
            </Grid>
            <Grid cols={3} grow={false} align='center'>
              <span>C</span>
            </Grid>
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Rows = () => (
        <>
          <Next.Container gap='md' data-testid='rows' layout='row' columns='10rem 1fr min-content'>
            <span>A</span>
            <span>B</span>
          </Next.Container>
          <Next.Container layout='row' columns='repeat(3, 1fr)'>
            <span>C</span>
          </Next.Container>
        </>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('Grids that are not converted', () => {
    const input = code`
      import { Grid } from '@dxos/react-ui';

      export const Rest = ({ cols }: { cols: number }) => (
        <>
          <Grid cols={2}>grows by default</Grid>
          <Grid cols={2} grow={false}>stretches</Grid>
          <Grid cols={cols} grow={false} align='center'>computed</Grid>
          <Grid cols='subgrid' grow={false} align='center'>subgrid</Grid>
          <Grid cols={2} rows={2} grow={false} align='center'>rows</Grid>
          <Grid cols={2} grow={false} align='center' classNames='gap-1'>classes</Grid>
        </>
      );
    `;
    const { output, residue } = transformFixture(layout, input);
    expect(output).toBe(input);
    expect(residue).toEqual([
      'Grid not converted: it grows to fill its parent (Grid grow defaults to true)',
      "Grid not converted: align other than 'center' (a Container row centres its cells)",
      'Grid not converted: cols is missing, computed or subgrid',
      'Grid not converted: cols is missing, computed or subgrid',
      'Grid not converted: rows (a person decides the layout)',
      'Grid not converted: classNames (a person decides the layout)',
    ]);
  });
});
