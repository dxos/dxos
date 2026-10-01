//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { renames } from './renames.ts';

describe('collections', () => {
  test('Select.Root: items from mapped Items, value as string[], handler takes details', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Picker = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
          <>
            <Next.Select.Root value={value} onValueChange={(next: string) => onChange(next)}>
              <Next.Select.Trigger />
              <Next.Select.Content>
                {LAYOUTS.map((layout) => (
                  <Next.Select.Item key={layout} item={{ value: layout, label: layout }} />
                ))}
              </Next.Select.Content>
            </Next.Select.Root>
            <Next.Select.Root defaultValue='a' onValueChange={onChange}>
              <Next.Select.Content>
                <Next.Select.Item item={{ value: 'a', label: 'A' }} />
                <Next.Select.Item item={{ value: 'b', label: 'B' }} />
              </Next.Select.Content>
            </Next.Select.Root>
          </>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Picker = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
        <>
          <Next.Select.Root value={[value]} onValueChange={({ value: [next] }) => onChange(next)} items={LAYOUTS.map((layout) => ({ value: layout, label: layout }))}>
            <Next.Select.Trigger />
            <Next.Select.Content>
              {LAYOUTS.map((layout) => (
                <Next.Select.Item key={layout} item={{ value: layout, label: layout }} />
              ))}
            </Next.Select.Content>
          </Next.Select.Root>
          <Next.Select.Root defaultValue={['a']} onValueChange={({ value: [value] }) => onChange(value)} items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}>
            <Next.Select.Content>
              <Next.Select.Item item={{ value: 'a', label: 'A' }} />
              <Next.Select.Item item={{ value: 'b', label: 'B' }} />
            </Next.Select.Content>
          </Next.Select.Root>
        </>
      );
    `);
    expect(residue).toEqual([]);
  });

  test('Select.Root is idempotent and reports conditional Items', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Picker = ({ on }: { on: boolean }) => (
          <Next.Select.Root value={['a']} onValueChange={({ value: [next] }) => next} items={[]}>
            <Next.Select.Item item={{ value: 'a', label: 'A' }} />
          </Next.Select.Root>
        );

        export const Conditional = ({ on }: { on: boolean }) => (
          <Next.Select.Root>
            {on && <Next.Select.Item item={{ value: 'a', label: 'A' }} />}
          </Next.Select.Root>
        );
      `,
    );
    expect(output).toContain(`<Next.Select.Root value={['a']} onValueChange={({ value: [next] }) => next} items={[]}>`);
    expect(residue).toEqual([
      'Select.Root items: an Item is conditional, computed or has no derivable value and label; pass the options by hand',
    ]);
  });

  test('Select.Root: items from the Select.Options the same run converts', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Select } from '@dxos/react-ui';

        export const Picker = () => (
          <Select.Root>
            <Select.Option value='a'>A</Select.Option>
            <Select.Option value='b' />
          </Select.Root>
        );
      `,
    );
    expect(output).toContain(`<Select.Root items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'b' }]}>`);
    expect(residue).toEqual([]);
  });

  test('Listbox.Root (react-ui-list): items from Item ids and ItemText labels', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Listbox } from '@dxos/react-ui-list/next';

        export const Surfaces = ({ surfaces }: { surfaces: { id: string }[] }) => (
          <Listbox.Root>
            <Listbox.Content>
              {surfaces.map((surface) => (
                <Listbox.Item key={surface.id} id={surface.id}>
                  <Listbox.ItemText>{surface.id}</Listbox.ItemText>
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        );
      `,
    );
    expect(output).toContain(
      '<Listbox.Root items={surfaces.map((surface) => ({ value: surface.id, label: surface.id }))}>',
    );
    expect(residue).toEqual([]);
  });

  test('Menu.Item: icon and label children → item record', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Items = ({ t, onOpen }: { t: (key: string) => string; onOpen: () => void }) => (
          <Next.Menu.Content>
            <Next.Menu.Item onClick={onOpen}>
              <Next.Icon icon='ph--arrow-square-out--regular' />
              Open
            </Next.Menu.Item>
            <Next.Menu.Item data-testid='x' onClick={onOpen}>{t('delete.label')}</Next.Menu.Item>
            <Next.Menu.Item onClick={onOpen}>
              <span>custom</span>
            </Next.Menu.Item>
          </Next.Menu.Content>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Items = ({ t, onOpen }: { t: (key: string) => string; onOpen: () => void }) => (
        <Next.Menu.Content>
          <Next.Menu.Item onClick={onOpen} item={{ value: 'Open', label: 'Open', icon: 'ph--arrow-square-out--regular' }} />
          <Next.Menu.Item data-testid='x' onClick={onOpen} item={{ value: t('delete.label'), label: t('delete.label') }} />
          <Next.Menu.Item onClick={onOpen}>
            <span>custom</span>
          </Next.Menu.Item>
        </Next.Menu.Content>
      );
    `);
    expect(residue).toEqual([
      'Menu.Item takes item data: its label is not one text or expression; compose the row by hand',
    ]);
  });

  test('Card.Root fullWidth and ScrollArea.Root thin/centered dropped; padding reported', () => {
    const { output, residue } = transformFixture(
      renames,
      code`
        import { Next } from '@dxos/react-ui/next';

        export const Panel = () => (
          <Next.ScrollArea.Root thin centered padding>
            <Next.Card.Root fullWidth />
          </Next.ScrollArea.Root>
        );
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Panel = () => (
        <Next.ScrollArea.Root>
          <Next.Card.Root />
        </Next.ScrollArea.Root>
      );
    `);
    expect(residue).toEqual(['ScrollArea padding dropped: compose Viewport asChild > Container gutter by hand']);
  });
});
