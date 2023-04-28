//
// Copyright 2023 DXOS.org
//

type ClassNameValue = ClassNameArray | string | null | undefined | 0 | false;
type ClassNameArray = ClassNameValue[];

export type ThemeFunction<P extends Record<string, any>> = (
  path: string,
  defaultClassName: string,
  styleProps?: P,
  ...options: any[]
) => string;
export type ComponentFunction<P extends Record<string, any>> = (styleProps: P, ...options: any[]) => string;
export type ComponentFragment<P extends Record<string, any>> = (styleProps: P) => ClassNameValue[];
export type Theme<P extends Record<string, any>> = { [key: string]: Theme<P> | ComponentFunction<P> };
