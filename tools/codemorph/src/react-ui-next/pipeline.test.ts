//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { runTransform } from './runner.ts';
import { code } from './testing.ts';
import { TRANSFORMS } from './transforms/index.ts';

const runAll = (input: string) => {
  let text = input;
  const residue: string[] = [];
  TRANSFORMS.forEach((transform, index) => {
    const result = runTransform(
      transform,
      'Fixture.tsx',
      text,
      TRANSFORMS.slice(0, index).map((previous) => previous.name),
    );
    residue.push(...result.residue.map((item) => `${item.transform}: ${item.reason}`));
    text = result.text;
  });
  return { text, residue };
};

describe('all transforms', () => {
  test('a current article ends on Next, with each residue item reported once', () => {
    const input = code`
      import { Field, IconButton, Icon, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
      import { MenuBuilder } from '@dxos/react-ui-menu';

      export const Article = ({ busy }: { busy: boolean }) => {
        const { t } = useTranslation();
        return (
          <Panel.Root classNames='dx-document'>
            <Panel.Toolbar asChild>
              <Toolbar.Root>
                <Toolbar.IconButton icon='ph--plus--regular' label={t('add')} iconOnly />
                <Icon icon='ph--check--regular' size={5} classNames='shrink-0 text-success-text' />
              </Toolbar.Root>
            </Panel.Toolbar>
            <Panel.Content>
              <Field.Switch />
            </Panel.Content>
          </Panel.Root>
        );
      };
    `;
    const { text, residue } = runAll(input);
    expect(text).toBe(code`
      import { useTranslation } from '@dxos/react-ui';
      import { Next } from '@dxos/react-ui/next';
      import { MenuBuilder } from '@dxos/react-ui-menu/next';

      export const Article = ({ busy }: { busy: boolean }) => {
        const { t } = useTranslation();
        return (
          <Next.Panel.Root width='document'>
            <Next.Panel.Header>
              <Next.Toolbar.Root>
                <Next.Button icon='ph--plus--regular' label={t('add')} iconOnly />
                <Next.Icon icon='ph--check--regular' size='lg' valence='success' />
              </Next.Toolbar.Root>
            </Next.Panel.Header>
            <Next.Panel.Body>
              <Next.Switch />
            </Next.Panel.Body>
          </Next.Panel.Root>
        );
      };
    `);
    expect(residue).toEqual([]);
    expect(runAll(text).text).toBe(text);
  });
});
