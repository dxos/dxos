//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { renames } from './renames.ts';

describe('composites', () => {
  test('VirtualTrigger → Root positioning={virtualAnchor(ref)}', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Menu, Popover } from '@dxos/react-ui';

        export const Anchored = ({ ref, open }: { ref: any; open: boolean }) => (
          <>
            <Popover.Root open={open}>
              <Popover.VirtualTrigger key={iter} virtualRef={ref} />
              <Popover.Content />
            </Popover.Root>
            <Menu.Root open={open}>
              {open && <Menu.VirtualTrigger virtualRef={ref} />}
            </Menu.Root>
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Menu, Popover, virtualAnchor } from '@dxos/react-ui';

      export const Anchored = ({ ref, open }: { ref: any; open: boolean }) => (
        <>
          <Popover.Root open={open} positioning={virtualAnchor(ref)}>
            <Popover.Content />
          </Popover.Root>
          <Menu.Root open={open}>
            {open && <Menu.VirtualTrigger virtualRef={ref} />}
          </Menu.Root>
        </>
      );
    `);
    expect(residue).toEqual([
      'VirtualTrigger is not a direct child of its Root: add positioning={virtualAnchor(ref)} by hand',
    ]);
  });

  test('ActionIconButton → SystemButton preset or Card.Action', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Card, Dialog } from '@dxos/react-ui';

        export const Actions = ({ onDelete }: { onDelete: () => void }) => (
          <>
            <Dialog.Close asChild>
              <Dialog.ActionIconButton action='close' />
            </Dialog.Close>
            <Card.ActionIconButton action='delete' label='Delete row' onClick={onDelete} />
            <Card.ActionIconButton action='close' />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Card, Dialog, SystemButton } from '@dxos/react-ui';

      export const Actions = ({ onDelete }: { onDelete: () => void }) => (
        <>
          <Dialog.CloseTrigger asChild>
            <SystemButton.Close />
          </Dialog.CloseTrigger>
          <Card.Action icon='ph--trash--regular' label='Delete row' onClick={onDelete} />
          <Card.ActionIconButton action='close' />
        </>
      );
    `);
    expect(residue).toEqual([
      'Card.ActionIconButton without a label: Card.Action requires one (Next addition: default close/delete labels)',
    ]);
  });

  test('Listbox.ItemContent → row parts, keeping expressions in place', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Icon } from '@dxos/react-ui';
        import { Listbox } from '@dxos/react-ui-list';

        export const Rows = ({ name, url }: { name: string; url: string }) => (
          <Listbox.Item id='a'>
            <Listbox.ItemContent icon='ph--user--regular' title={name} description={url} />
            <Listbox.ItemContent icon={<Icon icon='ph--check--regular' size={5} />} title='Done' />
            <Listbox.ItemContent title={name} classNames='p-2' />
          </Listbox.Item>
        );
      `,
    );
    expect(output).toBe(code`
      import { Listbox } from '@dxos/react-ui-list';

      export const Rows = ({ name, url }: { name: string; url: string }) => (
        <Listbox.Item id='a'>
          <Listbox.ItemIcon icon='ph--user--regular' /><Listbox.ItemText>{name}</Listbox.ItemText><Listbox.ItemDescription>{url}</Listbox.ItemDescription>
          <Listbox.ItemIcon icon='ph--check--regular' size='lg' /><Listbox.ItemText>Done</Listbox.ItemText>
          <Listbox.ItemContent title={name} classNames='p-2' />
        </Listbox.Item>
      );
    `);
    expect(residue).toEqual([
      'Listbox.ItemContent: props other than icon, title, description (in that order); compose the row parts by hand',
    ]);
  });

  test('ToggleGroupIconItem and IconBlock', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { IconBlock, Icon, Toolbar } from '@dxos/react-ui';

        export const Bits = () => (
          <Toolbar.ToggleGroup>
            <Toolbar.ToggleGroupIconItem value='a' icon='ph--a--regular' label='A' iconOnly noTooltip />
            <IconBlock compact square>
              <Icon icon='ph--b--regular' />
            </IconBlock>
          </Toolbar.ToggleGroup>
        );
      `,
    );
    expect(output).toBe(code`
      import { Icon, Toolbar, ToggleGroup, Block } from '@dxos/react-ui';

      export const Bits = () => (
        <Toolbar.ToggleGroup>
          <ToggleGroup.Item value='a' icon='ph--a--regular' label='A' iconOnly showTooltip={false} />
          <Block compact>
            <Icon icon='ph--b--regular' />
          </Block>
        </Toolbar.ToggleGroup>
      );
    `);
    expect(residue).toEqual(['Next.Block has no compact variant']);
  });
});
