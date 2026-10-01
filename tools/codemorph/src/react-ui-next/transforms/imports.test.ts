//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { imports } from './imports.ts';

describe('imports', () => {
  test('react-ui components → Next namespace members; utilities stay', () => {
    const { output, residue } = transformFixture(
      imports,
      code`
        import React from 'react';

        import { Button, type ButtonProps, Icon as UIIcon, Panel, useTranslation } from '@dxos/react-ui';

        export const Thing = (props: ButtonProps) => {
          const { t } = useTranslation();
          const components = { Button };
          return (
            <Panel.Root>
              <Panel.Toolbar />
              <Button {...props}>
                <UIIcon icon='ph--x--regular' />
              </Button>
            </Panel.Root>
          );
        };
      `,
    );
    expect(output).toBe(code`
      import React from 'react';

      import { useTranslation } from '@dxos/react-ui';
      import { Next } from '@dxos/react-ui/next';

      export const Thing = (props: Next.ButtonProps) => {
        const { t } = useTranslation();
        const components = { Button: Next.Button };
        return (
          <Next.Panel.Root>
            <Next.Panel.Toolbar />
            <Next.Button {...props}>
              <Next.Icon icon='ph--x--regular' />
            </Next.Button>
          </Next.Panel.Root>
        );
      };
    `);
    expect(residue).toEqual(['Panel.Toolbar has no Next part (run renames first, or port by hand)']);
  });

  test('reuses an existing Next import; renamed names and names with no counterpart', () => {
    const { output, residue } = transformFixture(
      imports,
      code`
        import { ButtonGroup, Flex, IconButton, useSidebars } from '@dxos/react-ui';
        import { Next } from '@dxos/react-ui/next';

        export const Bar = () => {
          const sidebars = useSidebars();
          return (
            <Flex>
              <ButtonGroup>
                <IconButton icon='ph--x--regular' label='x' iconOnly />
                <Next.Button />
              </ButtonGroup>
            </Flex>
          );
        };
      `,
    );
    expect(output).toBe(code`
      import { Flex, IconButton } from '@dxos/react-ui';
      import { Next } from '@dxos/react-ui/next';

      export const Bar = () => {
        const sidebars = Next.useMainSidebars();
        return (
          <Flex>
            <Next.Group>
              <IconButton icon='ph--x--regular' label='x' iconOnly />
              <Next.Button />
            </Next.Group>
          </Flex>
        );
      };
    `);
    expect(residue).toEqual([
      'Flex: Flex → Container layout / Group; a layout decision',
      'IconButton is converted by the renames transform; run it first',
    ]);
  });

  test('a type-only Label is the i18n label type and stays', () => {
    const { output } = transformFixture(
      imports,
      code`
        import { type Label } from '@dxos/react-ui';

        export const label: Label = 'x';
      `,
    );
    expect(output).toBe(code`
      import { type Label } from '@dxos/react-ui';

      export const label: Label = 'x';
    `);
  });

  test('the current Tree stays: its render props have no Next counterpart', () => {
    const { output, residue } = transformFixture(
      imports,
      code`
        import { Tree } from '@dxos/react-ui-list';

        export const Files = () => <Tree id='x' />;
      `,
    );
    expect(output).toContain(`import { Tree } from '@dxos/react-ui-list';`);
    expect(residue).toEqual([
      'Tree: the current Tree takes render props (renderColumns/renderHeading); compose Next Tree.Root/Content/Item by hand',
    ]);
  });

  test('type-only imports become a type-only Next import', () => {
    const { output } = transformFixture(
      imports,
      code`
        import type { IconProps } from '@dxos/react-ui';

        export type Props = IconProps & { extra: boolean };
      `,
      'types.ts',
    );
    expect(output).toBe(code`
      import type { Next } from '@dxos/react-ui/next';

      export type Props = Next.IconProps & { extra: boolean };
    `);
  });

  test('list, form and menu move entry', () => {
    const { output, residue } = transformFixture(
      imports,
      code`
        import { Form } from '@dxos/react-ui-form';
        import { Listbox, Path } from '@dxos/react-ui-list';
        import { MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

        export const List = () => <Listbox.Root />;
      `,
    );
    expect(output).toBe(code`
      import { Path } from '@dxos/react-ui-list';
      import { Form } from '@dxos/react-ui-form/next';
      import { Listbox } from '@dxos/react-ui-list/next';
      import { MenuBuilder, useMenuActions } from '@dxos/react-ui-menu/next';

      export const List = () => <Listbox.Root />;
    `);
    expect(residue).toEqual([]);
  });

  test('shadowed and re-exported bindings are left for a person', () => {
    const { output, residue } = transformFixture(
      imports,
      code`
        import { Icon, Tag } from '@dxos/react-ui';

        export { Tag };
        export const render = (Icon: string) => Icon;
      `,
    );
    expect(output).toContain(`import { Icon, Tag } from '@dxos/react-ui';`);
    expect(residue).toEqual([
      'Icon is also declared in this file; rewrite its uses by hand',
      'Tag is re-exported; re-export Next.Tag by hand',
    ]);
  });

  test('a *Props type with no Next name becomes a local alias of the Next part props', () => {
    const { output, residue } = transformFixture(
      imports,
      code`
        import React from 'react';

        import { type IconButtonProps, type ScrollAreaRootProps, type ThemedClassName, type FlexProps } from '@dxos/react-ui';

        export type Props = ScrollAreaRootProps & IconButtonProps & FlexProps & ThemedClassName<{}>;
      `,
      'types.ts',
    );
    expect(output).toBe(code`
      import React from 'react';

      import { type ThemedClassName, type FlexProps } from '@dxos/react-ui';
      import type { Next } from '@dxos/react-ui/next';

      type ScrollAreaRootProps = React.ComponentProps<typeof Next.ScrollArea.Root>;

      export type Props = ScrollAreaRootProps & Next.ButtonProps & FlexProps & ThemedClassName<{}>;
    `);
    expect(residue).toEqual([
      'type ScrollAreaRootProps is now a local alias of ComponentProps<typeof ScrollArea.Root>',
      'type FlexProps has no Next counterpart',
    ]);
  });
});
