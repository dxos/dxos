//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { renames } from './renames.ts';

describe('renames', () => {
  test('Panel regions; Body keeps asChild and its ScrollArea', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';

        export const Article = () => (
          <Panel.Root>
            <Panel.Toolbar asChild>
              <Toolbar.Root />
            </Panel.Toolbar>
            <Panel.Content asChild>
              <ScrollArea.Root>
                <ScrollArea.Viewport />
              </ScrollArea.Root>
            </Panel.Content>
            <Panel.Statusbar>status</Panel.Statusbar>
          </Panel.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';

      export const Article = () => (
        <Panel.Root>
          <Panel.Header>
            <Toolbar.Root />
          </Panel.Header>
          <Panel.Body asChild>
            <ScrollArea.Root>
              <ScrollArea.Viewport />
            </ScrollArea.Root>
          </Panel.Body>
          <Panel.Footer>status</Panel.Footer>
        </Panel.Root>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('IconButton → Button; props mapped and the import swapped', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { IconButton, Toolbar } from '@dxos/react-ui';

        export const Buttons = () => (
          <Toolbar.Root density='sm'>
            <IconButton icon='ph--x--regular' label='Close' iconOnly noTooltip size={5} square density='sm' />
            <IconButton icon='ph--caret-down--regular' label='More' iconEnd noTooltip />
            <Toolbar.IconButton icon='ph--plus--regular' label='Add' iconOnly />
          </Toolbar.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Toolbar, Button } from '@dxos/react-ui';

      export const Buttons = () => (
        <Toolbar.Root size='sm'>
          <Button icon='ph--x--regular' label='Close' iconOnly showTooltip={false} iconSize='lg' />
          <Button label='More' iconEnd='ph--caret-down--regular' />
          <Button icon='ph--plus--regular' label='Add' iconOnly />
        </Toolbar.Root>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('Next spelling is renamed in place', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Header = () => <Next.Panel.Toolbar asChild><Next.Toolbar.Root /></Next.Panel.Toolbar>;
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Header = () => <Next.Panel.Header><Next.Toolbar.Root /></Next.Panel.Header>;
    `);
  });

  test('Radix part names → Ark names; Portal, Overlay and Arrow unwrapped', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Dialog, Menu, Popover, Tooltip } from '@dxos/react-ui';

        export const Overlays = () => (
          <Tooltip.Provider>
            <Dialog.Root>
              <Dialog.Overlay>
                <Dialog.Content>
                  <Dialog.ActionBar>
                    <Dialog.Close />
                  </Dialog.ActionBar>
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Root>
            <Popover.Root>
              <Popover.Portal>
                <Popover.Content>
                  <Popover.Viewport>body</Popover.Viewport>
                  <Popover.Arrow />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <Menu.Root>
              <Menu.Content>
                <Menu.RadioGroup />
                <Menu.SubTrigger />
              </Menu.Content>
            </Menu.Root>
          </Tooltip.Provider>
        );
      `,
    );
    expect(output).toBe(code`
      import { Dialog, Menu, Popover, Tooltip } from '@dxos/react-ui';

      export const Overlays = () => (
        <>
          <Dialog.Root>
              <Dialog.Content>
                <Dialog.Footer>
                  <Dialog.CloseTrigger />
                </Dialog.Footer>
              </Dialog.Content>
          </Dialog.Root>
          <Popover.Root>
              <Popover.Content>
                <Popover.Body>body</Popover.Body>
              </Popover.Content>
          </Popover.Root>
          <Menu.Root>
            <Menu.Content>
              <Menu.RadioItemGroup />
              <Menu.TriggerItem />
            </Menu.Content>
          </Menu.Root>
        </>
      );
    `);
  });

  test('Select.Option → Select.Item with item data', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Select } from '@dxos/react-ui';

        export const Picker = ({ t }: { t: (key: string) => string }) => (
          <Select.Root>
            <Select.TriggerButton />
            <Select.Content>
              <Select.Option value='http'>HTTP</Select.Option>
              <Select.Option key='a' value={ANY}>{t('any')}</Select.Option>
              <Select.Option value='x'>
                <span>X</span>
              </Select.Option>
            </Select.Content>
          </Select.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Select } from '@dxos/react-ui';

      export const Picker = ({ t }: { t: (key: string) => string }) => (
        <Select.Root>
          <Select.Trigger />
          <Select.Content>
            <Select.Item item={{ value: 'http', label: 'HTTP' }} />
            <Select.Item key='a' item={{ value: ANY, label: t('any') }} />
            <Select.Item value='x'>
              <span>X</span>
            </Select.Item>
          </Select.Content>
        </Select.Root>
      );
    `);
    expect(residue).toEqual(['Select.Item takes `item` data ({ value, label }); children replace the whole row']);
  });

  test('Phase A4 ports: Tabs, Splitter, Toast, Avatar, Progress, Icon size', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Avatar, Icon, Progress, Splitter, Tabs, Toast } from '@dxos/react-ui';

        export const Ports = () => (
          <>
            <Tabs.Root>
              <Tabs.Tablist>
                <Tabs.Button value='a'>A</Tabs.Button>
              </Tabs.Tablist>
              <Tabs.Panel value='a' />
            </Tabs.Root>
            <Splitter.Root>
              <Splitter.Handle />
            </Splitter.Root>
            <Toast.Viewport />
            <Toast.Actions>
              <Toast.Action altText='Undo'>Undo</Toast.Action>
            </Toast.Actions>
            <Avatar.Root labelId={id}>
              <Avatar.Content imgSrc={url} variant='circle' />
            </Avatar.Root>
            <Progress progress={0.5} />
            <Icon icon='ph--x--regular' size={4} />
            <Icon icon='ph--x--regular' size={8} />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Avatar, Icon, Progress, Splitter, Tabs, Toast } from '@dxos/react-ui';

      export const Ports = () => (
        <>
          <Tabs.Root orientation='vertical'>
            <Tabs.List>
              <Tabs.Trigger value='a'>A</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value='a' />
          </Tabs.Root>
          <Splitter.Root>
            <Splitter.ResizeTrigger />
          </Splitter.Root>
          <Toast.Toaster />
          <Toast.Footer>
            <Toast.ActionTrigger>Undo</Toast.ActionTrigger>
          </Toast.Footer>
          <Avatar.Root aria-labelledby={id} src={url} variant='circle' />
          <Progress value={0.5} />
          <Icon icon='ph--x--regular' size='md' />
          <Icon icon='ph--x--regular' size='xl' />
        </>
      );
    `);
    expect(residue).toEqual(["size {8} rounded to the nearest step, 'xl'"]);
  });

  test('list parts, including a part that becomes a react-ui component', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Listbox, OrderedList } from '@dxos/react-ui-list';

        export const Lists = () => (
          <>
            <Listbox.Item>
              <Listbox.ItemLabel>Label</Listbox.ItemLabel>
              <Listbox.Indicator />
            </Listbox.Item>
            <OrderedList.Item>
              <OrderedList.Title>Title</OrderedList.Title>
              <OrderedList.DeleteButton />
            </OrderedList.Item>
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Listbox, OrderedList } from '@dxos/react-ui-list';
      import { SystemButton } from '@dxos/react-ui';

      export const Lists = () => (
        <>
          <Listbox.Item>
            <Listbox.ItemText>Label</Listbox.ItemText>
            <Listbox.ItemIndicator />
          </Listbox.Item>
          <OrderedList.Item>
            <OrderedList.ItemText>Title</OrderedList.ItemText>
            <SystemButton.Remove />
          </OrderedList.Item>
        </>
      );
    `);
  });

  test('Banner.Empty → Empty with its label as children', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Banner } from '@dxos/react-ui';

        export const Placeholder = ({ label }: { label: string }) => (
          <>
            <Banner.Empty icon='ph--warning--regular' label={label} classNames='dx-expand' />
            <Banner.Empty label='Nothing here' />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Empty } from '@dxos/react-ui';

      export const Placeholder = ({ label }: { label: string }) => (
        <>
          <Empty icon='ph--warning--regular' classNames='dx-expand'>{label}</Empty>
          <Empty>Nothing here</Empty>
        </>
      );
    `);
  });

  test('elements from other packages are untouched', () => {
    const input = code`
      import { Panel } from './Panel';

      export const Local = () => <Panel.Toolbar asChild />;
    `;
    expect(transformFixture(renames, input).output).toBe(input);
  });
});
