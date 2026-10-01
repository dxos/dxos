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
});
