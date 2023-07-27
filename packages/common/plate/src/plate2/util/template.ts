//
// Copyright 2023 DXOS.org
//

import { Effect } from './effect';
import { Path, FileSlots, FileEffect } from './file';
import { MaybePromise } from './promise';

export const TEMPLATE_FILE_INCLUDE = /(.*)\.t\.[tj]s$/;
/** Do not process files that are compilation noise like .map and .t.d.ts */
export const TEMPLATE_FILE_IGNORE = [/\.t\.d\./, /\.d\.ts$/, /\.map$/, /template\.t\.[tj]s$/];

export const isTemplateFile = (file: string) =>
  TEMPLATE_FILE_INCLUDE.test(file) && !TEMPLATE_FILE_IGNORE.some((pattern) => pattern.test(file));

export const getOutputNameFromTemplateName = (s: string): string => {
  const e = TEMPLATE_FILE_INCLUDE.exec(s);
  const out = e?.[1];
  return out ?? s;
};

export type Transform<I, O> = (input: I) => MaybePromise<O>;

export type Slot<R = string, I = any, S extends Slots<I> = Slots<I>, C extends Context<I, S> = Context<I, S>> =
  | R
  | Transform<C, R>;
// export type Slot<R = string, I = any, S extends Slots<I> = Slots<I>> = R | Transform<Context<I, S>, R>;

export type ExtractResult<S extends Slot> = S extends Slot<infer U> ? U : never;

export type Slots<I = any, TSlots extends Slots = {}, C extends Context<I, TSlots> = Context<I, TSlots>> = Record<
  string,
  Slot<any, I, TSlots, C>
>;

export type Options<I, S extends Slots<I> = Slots<I>> = {
  input?: I;
  slots?: S;
  outputDirectory?: Path;
  relativeTo?: Path;
  overwrite?: boolean;
};

export type Context<I = any, S extends Slots<I> = Slots<I>> = Required<Options<I, S>> & {
  outputFile: Path;
  inherited: FileResults<I> | undefined;
};

export type Template<I = any, TSlots extends Slots<I> = Slots<I>> = Transform<Options<I, TSlots>, FileResults>;

export type RenderedSlots<TSlots extends Slots> = { [key in keyof TSlots]: ExtractResult<TSlots[key]> };

export const renderSlots = async <
  I = any,
  TSlots extends Slots<I, {}, TContext> = {},
  TContext extends Context<I, TSlots> = Context<I, TSlots>,
>(
  slots: TSlots,
  context: (rendered: Partial<RenderedSlots<TSlots>>) => TContext,
): Promise<RenderedSlots<TSlots>> => {
  const result: RenderedSlots<TSlots> = {} as any;
  for (const key in slots) {
    result[key] = typeof slots[key] === 'function' ? await slots[key](context?.(result)) : slots[key];
  }
  return result;
};

export const slotDefault = <T>(slot: Slot<T>, value: T) => {
  return typeof slot === 'function' ? (context: any) => (slot as Function)(context) ?? value : slot ?? value;
};

export type FileResults<I = any, S extends FileSlots<I> = FileSlots<I>> = Effect<Context<I, S>> & {
  files: FileEffect[];
};

export const results = (files: FileEffect[]): FileResults => ({
  files,
  apply: async (options) => Promise.all(files.map((e) => e.apply({ overwrite: options?.overwrite ?? false }))),
});
