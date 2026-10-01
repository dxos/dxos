//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { renames } from './renames.ts';

describe('button density', () => {
  test('(a) dropped where the enclosing scope already sets it', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Button, Toolbar } from '@dxos/react-ui';

        export const Bar = () => (
          <Toolbar.Root density='sm'>
            <Button density='sm'>Same</Button>
            <Button density='md'>Different</Button>
          </Toolbar.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Button, Toolbar } from '@dxos/react-ui';

      export const Bar = () => (
        <Toolbar.Root size='sm'>
          <Button>Same</Button>
          <Button size='md'>Different</Button>
        </Toolbar.Root>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('(b) a density every button in a scope shares is hoisted to the scope once', () => {
    const { output, counts } = transformFixture(
      renames,
      code`
        import { Button, Panel, Toolbar } from '@dxos/react-ui';

        export const Bar = ({ items }: { items: string[] }) => (
          <Panel.Root>
            <Toolbar.Root>
              <Button density='sm'>One</Button>
              {items.map((item) => (
                <Button key={item} density='sm'>{item}</Button>
              ))}
            </Toolbar.Root>
          </Panel.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Button, Panel, Toolbar } from '@dxos/react-ui';

      export const Bar = ({ items }: { items: string[] }) => (
        <Panel.Root>
          <Toolbar.Root size='sm'>
            <Button>One</Button>
            {items.map((item) => (
              <Button key={item}>{item}</Button>
            ))}
          </Toolbar.Root>
        </Panel.Root>
      );
    `);
    expect(counts['button density hoisted to Toolbar.Root size']).toBe(1);
  });

  test('(c) set on the button when the buttons in the scope differ', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Button, Toolbar } from '@dxos/react-ui';

        export const Bar = () => (
          <Toolbar.Root>
            <Button density='sm'>Small</Button>
            <Button>Default</Button>
          </Toolbar.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Button, Toolbar } from '@dxos/react-ui';

      export const Bar = () => (
        <Toolbar.Root>
          <Button size='sm'>Small</Button>
          <Button>Default</Button>
        </Toolbar.Root>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('(c) set on the button and reported when the caller decides the scope', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { IconButton } from '@dxos/react-ui';

        export const Close = () => <IconButton icon='ph--x--regular' label='Close' iconOnly density='sm' />;
      `,
    );
    expect(output).toBe(code`
      import { Button } from '@dxos/react-ui';

      export const Close = () => <Button icon='ph--x--regular' label='Close' iconOnly size='sm' />;
    `);
    expect(residue).toEqual(['button size set: its scope is decided by the caller (another component)']);
  });

  test('a computed density is renamed and reported', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Button, Toolbar } from '@dxos/react-ui';

        export const Bar = ({ density }: { density: 'sm' | 'md' }) => (
          <Toolbar.Root>
            <Button density={density}>One</Button>
          </Toolbar.Root>
        );
      `,
    );
    expect(output).toContain('<Button size={density}>One</Button>');
    expect(residue).toEqual(['button density with a computed value renamed to size; check it is xs–xl']);
  });
});
