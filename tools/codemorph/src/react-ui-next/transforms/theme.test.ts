//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { code, transformFixture } from '../testing.ts';
import { theme } from './theme.ts';

describe('theme', () => {
  test('useThemeContext() fields → Next hooks; tx stays and is reported', () => {
    const { output, residue } = transformFixture(
      theme,
      code`
        import { useThemeContext, useTranslation } from '@dxos/react-ui';

        export const Mode = () => {
          const { themeMode } = useThemeContext();
          return themeMode;
        };

        export const Device = () => {
          const { platform: os, hasIosKeyboard, tx } = useThemeContext();
          return tx('x', os, hasIosKeyboard);
        };
      `,
    );
    expect(output).toBe(code`
      import { useThemeContext, useTranslation } from '@dxos/react-ui';
      import { Next } from '@dxos/react-ui/next';

      export const Mode = () => {
        const themeMode = Next.useThemeMode();
        return themeMode;
      };

      export const Device = () => {
        const os = Next.usePlatform();
        const hasIosKeyboard = Next.useIosKeyboard();
        const { tx } = useThemeContext();
        return tx('x', os, hasIosKeyboard);
      };
    `);
    expect(residue).toEqual(['useThemeContext().tx has no Next hook (tx goes with the current components)']);
  });

  test('the import goes when every use is converted', () => {
    const { output } = transformFixture(
      theme,
      code`
        import { useThemeContext } from '@dxos/react-ui';

        export const Mode = () => {
          const { themeMode } = useThemeContext();
          return themeMode;
        };
      `,
    );
    expect(output).toBe(code`
      import { Next } from '@dxos/react-ui/next';

      export const Mode = () => {
        const themeMode = Next.useThemeMode();
        return themeMode;
      };
    `);
  });
});
