//
// Copyright 2023 DXOS.org
//

export type ClassNameValue = ClassNameArray | string | null | undefined | 0 | false;
export type ClassNameArray = ClassNameValue[];

export type ThemeFunction<P extends Record<string, any>> = (
  path: string,
  defaultClassName: string,
  styleProps?: P,
  ...etc: ClassNameArray
) => string;
export type ComponentFunction<P extends Record<string, any>> = (styleProps: P, ...etc: ClassNameArray) => string;
export type ComponentFragment<P extends Record<string, any>> = (styleProps: P) => ClassNameValue[];
export type Theme<P extends Record<string, any>> = { [key: string]: Theme<P> | ComponentFunction<P> };

export type SafeAreaPadding = Record<'top' | 'right' | 'bottom' | 'left', number>;

export type ThemeMode = 'light' | 'dark';

export type ThemeContextValue = {
  tx: ThemeFunction<any>;
  themeMode: ThemeMode;
  hasIosKeyboard?: boolean;
  safeAreaPadding?: SafeAreaPadding;
  iconsUrl?: string;
  noCache?: boolean;
};
