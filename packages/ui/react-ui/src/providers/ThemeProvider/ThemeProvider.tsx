//
// Copyright 2022 DXOS.org
//

// @import-as-namespace

import React, { type PropsWithChildren, createContext, useEffect, useMemo } from 'react';

import { trackKeyboardModality } from '@dxos/react-focus';
import { type Density, type Elevation, type ThemeFunction, type ThemeMode } from '@dxos/ui-types';

import { type SafeAreaPadding, useSafeArea } from '../../hooks/index.ts';
import { hasIosKeyboard } from '../../util/mobile.ts';
import * as DensityProvider from '../DensityProvider/DensityProvider.tsx';
import * as ElevationProvider from '../ElevationProvider/ElevationProvider.tsx';
import { IconRegistryProvider } from './IconRegistry.tsx';
import * as TranslationsProvider from './TranslationsProvider.tsx';
export type ThemeContextValue<P extends Record<string, any> = Record<string, any>> = {
  tx: ThemeFunction<P>;
  themeMode: ThemeMode;
  hasIosKeyboard: boolean;
  safeAreaPadding?: SafeAreaPadding;
  platform?: 'mobile' | 'desktop';
};

/**
 * @internal
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps<P extends Record<string, any> = Record<string, any>> = Omit<
  TranslationsProvider.RootProps,
  'children'
> &
  Partial<Omit<ThemeContextValue<P>, 'safeAreaPadding'>> &
  PropsWithChildren<{
    rootDensity?: Density;
    rootElevation?: Elevation;
  }>;

const ThemeProvider = ({
  children,
  fallback = null,
  resourceExtensions,
  appNs,
  tx = (_path, _styleProps, ..._options) => undefined,
  themeMode = 'dark',
  rootDensity = 'md',
  platform,
}: ThemeProviderProps) => {
  useEffect(() => {
    return document.defaultView ? trackKeyboardModality(document.defaultView) : undefined;
  }, []);

  const safeAreaPadding = useSafeArea();
  // Destructure all props explicitly so useMemo deps are stable primitives, not a new `rest` object every render.
  const contextValue = useMemo(
    () => ({ tx, themeMode, hasIosKeyboard: hasIosKeyboard(), safeAreaPadding, platform }),
    [tx, themeMode, safeAreaPadding, platform],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <IconRegistryProvider>
        <TranslationsProvider.Root
          {...{
            fallback,
            resourceExtensions,
            appNs,
          }}
        >
          <ElevationProvider.Root elevation='base'>
            <DensityProvider.Root density={rootDensity}>{children}</DensityProvider.Root>
          </ElevationProvider.Root>
        </TranslationsProvider.Root>
      </IconRegistryProvider>
    </ThemeContext.Provider>
  );
};

export { ThemeProvider as Root };
export type { ThemeProviderProps as RootProps };
export { type Label, isLabel, toLocalizedString } from '@dxos/ui-types/translations';
export {
  type IconRegistry,
  type IconSource,
  extendedIconSource,
  getIconRegistry,
  phosphorIconSource,
  useIconRegistry,
} from './icon-registry.ts';
export * from './IconRegistry.tsx';
export { TranslationsContext } from './TranslationsContext.ts';
export * from '../../hooks/useThemeContext.ts';
export * from '../../hooks/useTranslationsContext.ts';
export * from '../../theme/bindTheme.ts';
export * from '../../theme/defaultTheme.ts';
export * from '../../util/mobile.ts';
export { type Resource, type TFunction } from '@dxos/i18n';
export { Trans } from 'react-i18next';
