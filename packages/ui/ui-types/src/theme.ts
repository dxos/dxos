//
// Copyright 2023 DXOS.org
//

export type ClassNameValue = ClassNameArray | string | null | undefined | 0 | false;
export type ClassNameArray = ClassNameValue[];

export type ComponentFunction<P extends Record<string, any>> = (styleProps: P, ...etc: ClassNameArray) => string;
export type ComponentFragment<P extends Record<string, any>> = (styleProps: P) => ClassNameValue[];

export type Theme<P extends Record<string, any>> = { [key: string]: Theme<P> | ComponentFunction<P> };
export type ThemeMode = 'dark' | 'light';
export type ThemeFunction<P extends Record<string, any>> = (
  /** Path to resolve theme style. */
  path: string,
  /** Custom style properties. */
  styleProps?: P,
  /** Additional class names (passed to component). */
  ...etc: ClassNameArray
) => string | undefined;

export type ThemedClassName<P = {}> = Omit<P, 'className'> & {
  classNames?: ClassNameValue;
};
