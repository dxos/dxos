//
// Copyright 2023 DXOS.org
//

import { type Effect } from './effect';
import { type Path, type FileSlots, type FileEffect } from './file';
import { type MaybePromise, promise } from './promise';

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

export type Produce<I, O> = (input?: I) => MaybePromise<O>;

export type SlotFunction<
  R = string,
  I = any,
  S extends Slots<I> = Slots<I>,
  C extends Context<I, S> = Context<I, S>,
> = Transform<C, R>;

export type SlotProducer<
  R = string,
  I = any,
  S extends Slots<I> = Slots<I>,
  C extends Context<I, S> = Context<I, S>,
> = Produce<C, R>;

export type Slot<R = string, I = any, S extends Slots<I> = Slots<I>, C extends Context<I, S> = Context<I, S>> =
  | R
  | SlotFunction<R, I, S, C>;

export type ResultOf<S extends Slot> = S extends Slot<infer U> ? U : never;
export type InputOf<S extends Slot> = S extends Slot<any, infer I> ? I : never;
export type SlotsOf<S extends Slot> = S extends Slot<any, any, infer U> ? U : never;

export type Slots<I = any, TSlots extends Slots<I> = {}, C extends Context<I, TSlots> = Context<I, TSlots>> = Record<
  string,
  Slot<any, I, TSlots, C>
>;

export type SlotValues<TSlots extends Slots> = { [key in keyof TSlots]: ResultOf<TSlots[key]> };

export type SlotProducers<TSlots extends Slots> = {
  [key in keyof TSlots]: SlotProducer<ResultOf<TSlots[key]>, InputOf<TSlots[key]>>;
};

export type Slotify<I, T extends Slots<I>> = {
  [key in keyof T]: T[key] extends Function ? T[key] : Slot<T[key], I>;
};

export type Options<I, S extends Slots<I> = Slots<I>> = {
  input?: Partial<I>;
  slots?: S;
  outputDirectory?: Path;
  relativeTo?: Path;
  overwrite?: boolean;
};

export type Context<I = any, S extends Slots<I> = Slots<I>> = Required<Omit<Options<I, S>, 'slots' | 'input'>> & {
  input: I;
  outputFile: Path;
  slots: SlotProducers<S>;
  inherited: FileResults<I> | undefined;
};

export type Template<I = any, TSlots extends Slots<I> = Slots<I>> = Transform<Options<I, TSlots>, FileResults> & {
  slots?: TSlots;
};

export const renderSlots = async <
  I = any,
  TSlots extends Slots<I, {}, TContext> = {},
  TContext extends Context<I, TSlots> = Context<I, TSlots>,
>(
  slots: TSlots,
  context: (rendered: Partial<SlotValues<TSlots>>) => MaybePromise<TContext>,
): Promise<SlotValues<TSlots>> => {
  const result: SlotValues<TSlots> = {} as any;
  const ctx = await promise(context(result));
  for (const key in slots) {
    result[key] = typeof slots[key] === 'function' ? await slots[key](ctx) : slots[key];
  }
  return result;
};

export const slotDefault = <T>(slot: Slot<T>, value: T) => {
  return typeof slot === 'function' ? (context: any) => (slot as Function)(context) ?? value : slot ?? value;
};

export type FileApplyResult = {
  filesWritten: number;
};

export type FileResults<I = any, S extends FileSlots<I> = FileSlots<I>> = Effect<Context<I, S>, FileApplyResult> & {
  files: FileEffect[];
};

export const results = (files: FileEffect[]): FileResults => ({
  files,
  apply: async (options) =>
    (await Promise.all(files.map((e) => e.apply({ overwrite: options?.overwrite ?? false })))).reduce(
      (last, next) => ({ filesWritten: last.filesWritten + next.filesWritten }),
      { filesWritten: 0 },
    ),
});
