//
// Copyright 2026 DXOS.org
//

// `kbn-handlebars` ships its source `.ts` (no `.d.ts`) and the source references
// the removed `hbs` namespace from older `@types/handlebars`, so importing it
// directly forces TypeScript to compile the upstream source and fail.
//
// This vendor wrapper exposes only the surface the DXOS codebase uses
// (`Handlebars.create`, `registerHelper`, `compileAST`).

type HelperDelegate = (this: any, ...args: any[]) => any;
type TemplateDelegate<T = any> = (context: T, options?: Record<string, unknown>) => string;

export interface Handlebars {
  create(): Handlebars;
  registerHelper(name: string, fn: HelperDelegate): void;
  registerHelper(helpers: Record<string, HelperDelegate>): void;
  compileAST<T = any>(input: string, options?: Record<string, unknown>): TemplateDelegate<T>;
}

declare const handlebars: Handlebars;
export default handlebars;

export const compileFnName: 'compile' | 'compileAST';
