//
// Copyright 2023 DXOS.org
//

export type ThemeFunction<P extends Record<string, any>> = (
  path: string,
  defaultClassName: string,
  styleProps?: P
) => string;
export type ComponentFunction<P extends Record<string, any>> = (styleProps: P) => string;
export type Theme = { [key: string]: Theme | ComponentFunction<any> };
