//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { renames } from './renames.ts';

describe('popups', () => {
  test('onOpenChange takes details; Content placement moves to Root positioning', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Popup = ({ setOpen, side }: { setOpen: (open: boolean) => void; side: 'top' }) => (
          <>
            <Next.Popover.Root onOpenChange={setOpen}>
              <Next.Popover.Content side='top' align='start' sideOffset={4} collisionPadding={8} />
            </Next.Popover.Root>
            <Next.Menu.Root onOpenChange={(next) => setOpen(next)}>
              <Next.Menu.Content side={side} />
            </Next.Menu.Root>
            <Next.Dialog.Root onOpenChange={(open: boolean) => setOpen(open)} />
            <Next.Dialog.Root onOpenChange={side ? setOpen : undefined} />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Popup = ({ setOpen, side }: { setOpen: (open: boolean) => void; side: 'top' }) => (
        <>
          <Next.Popover.Root onOpenChange={({ open }) => setOpen(open)} positioning={{ placement: 'top-start', gutter: 4, overflowPadding: 8 }}>
            <Next.Popover.Content />
          </Next.Popover.Root>
          <Next.Menu.Root onOpenChange={({ open: next }) => setOpen(next)}>
            <Next.Menu.Content side={side} />
          </Next.Menu.Root>
          <Next.Dialog.Root onOpenChange={({ open }) => setOpen(open)} />
          <Next.Dialog.Root onOpenChange={({ open }) => (side ? setOpen : undefined)(open)} />
        </>
      );
    `);
    expect(residue).toEqual([
      'Menu.Content side → Menu.Root positioning ({ placement, gutter, overflowPadding }) by hand',
    ]);
  });

  test('Card.Block end → Block rail', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Card } from '@dxos/react-ui';

        export const Row = () => <Card.Block end>x</Card.Block>;
      `,
    );
    expect(output).toBe(code`
      import { Block } from '@dxos/react-ui';

      export const Row = () => <Block rail='end'>x</Block>;
    `);
  });

  test('ToggleGroup → ToggleGroup.Root', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Scope = () => <Next.ToggleGroup type='single' />;
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Scope = () => <Next.ToggleGroup.Root type='single' />;
    `);
  });

  test('Card.Poster image → src', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Poster = () => <Next.Card.Poster alt='a' image='b.png' />;
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Poster = () => <Next.Card.Poster alt='a' src='b.png' />;
    `);
  });

  test('Popover.Content onOpenAutoFocus preventDefault → Root autoFocus={false}', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Popup = () => (
          <Next.Popover.Root>
            <Next.Popover.Content onOpenAutoFocus={(event: Event) => event.preventDefault()} />
          </Next.Popover.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Popup = () => (
        <Next.Popover.Root autoFocus={false}>
          <Next.Popover.Content />
        </Next.Popover.Root>
      );
    `);
  });

  test('Checkbox and Switch onCheckedChange take details', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Switch } from '@dxos/react-ui';
        import { Next } from '@dxos/react-ui/next';

        export const Controls = ({ set }: { set: (on: boolean) => void }) => (
          <>
            <Next.Checkbox onCheckedChange={set} />
            <Next.Switch onCheckedChange={(on) => set(on)} />
            <Switch onCheckedChange={set} />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Switch } from '@dxos/react-ui';
      import { Next } from '@dxos/react-ui/next';

      export const Controls = ({ set }: { set: (on: boolean) => void }) => (
        <>
          <Next.Checkbox onCheckedChange={({ checked }) => set(checked === true)} />
          <Next.Switch onCheckedChange={({ checked: on }) => set(on)} />
          <Switch onCheckedChange={set} />
        </>
      );
    `);
  });

  test('DragHandle testId → data-testid', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Handle = () => <Next.DragHandle testId='x' />;
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Handle = () => <Next.DragHandle data-testid='x' />;
    `);
  });

  test('Button asChild around a Trigger is unwrapped', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Picker = () => (
          <Next.Select.Root items={[]}>
            <Next.Button asChild>
              <Next.Select.Trigger />
            </Next.Button>
            <Next.Button asChild>
              <a href='x'>x</a>
            </Next.Button>
          </Next.Select.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Picker = () => (
        <Next.Select.Root items={[]}>
            <Next.Select.Trigger />
          <Next.Button asChild>
            <a href='x'>x</a>
          </Next.Button>
        </Next.Select.Root>
      );
    `);
    expect(residue).toEqual([
      'Next.Button takes no asChild: use the child (a Trigger is a Button) or Link asChild by hand',
    ]);
  });

  test('SystemButton active → pressed / expanded', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Buttons = ({ on }: { on: boolean }) => (
          <>
            <Next.SystemButton.Star active={on} />
            <Next.SystemButton.Disclosure active={on} />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Buttons = ({ on }: { on: boolean }) => (
        <>
          <Next.SystemButton.Star pressed={on} />
          <Next.SystemButton.Disclosure expanded={on} />
        </>
      );
    `);
  });

  test('NumberInput with an onChange handler stays a native number Input', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Field } from '@dxos/react-ui';
        import { Next } from '@dxos/react-ui/next';

        export const Inputs = ({ set }: { set: (event: unknown) => void }) => (
          <>
            <Field.Input type='number' onChange={set} />
            <Next.NumberInput value='1' onChange={set} />
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Input } from '@dxos/react-ui';
      import { Next } from '@dxos/react-ui/next';

      export const Inputs = ({ set }: { set: (event: unknown) => void }) => (
        <>
          <Input type='number' onChange={set} />
          <Next.Input value='1' onChange={set} type='number' />
        </>
      );
    `);
  });

  test('a current part with no Next counterpart keeps density', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Tree } from '@dxos/react-ui-list';

        export const Files = () => <Tree id='x' density='sm' />;
      `,
    );
    expect(output).toContain(`<Tree id='x' density='sm' />`);
  });

  test('Button title with an Icon child → icon-only Button', () => {
    const { output } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Zoom = ({ zoom }: { zoom: () => void }) => (
          <Next.Button onClick={zoom} title='Zoom in.'>
            <Next.Icon icon='ph--magnifying-glass-plus--regular' />
          </Next.Button>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Zoom = ({ zoom }: { zoom: () => void }) => (
        <Next.Button onClick={zoom} label='Zoom in.' icon='ph--magnifying-glass-plus--regular' iconOnly />
      );
    `);
  });
});
