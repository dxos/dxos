//
// Copyright 2023 DXOS.org
//

import callsite from 'callsite';
import path from 'node:path';

import { type FileSlots, FileEffect } from './util/file';
import { imports, type Imports } from './util/imports';
import { error } from './util/logger';
import { pretty } from './util/pretty';
import {
  type Context,
  type Template,
  type Options,
  type Slots,
  results,
  renderSlots,
  getOutputNameFromTemplateName,
  type SlotValues,
  type ResultOf,
  type Slot,
} from './util/template';

export type Group<I = any> = (context: Options<I, any>) => Template<I, any>[];

export type SlotsWithContext<I, TSlots extends Slots<I, any, TContext>, TContext extends Context<I, TSlots>> = {
  [slotKey in keyof TSlots]: Slot<ResultOf<TSlots[slotKey]>, I, TSlots, TContext>;
};

const lazy = <T>(o: T) => {
  const r: { [k in keyof T]: (...args: any[]) => T[k] } = {} as any;
  for (const k in o) {
    r[k] = typeof o[k] === 'function' ? (o[k] as () => any) : () => o[k];
  }
  return r;
};
export class Plate<I = null, TSlots extends Slots<I> = {}> {
  constructor(private parentSlots?: TSlots) {}

  protected template<TContext extends Context<I, TSlots> = Context<I, TSlots>>(
    templateFile: string,
    slots: FileSlots<I, TSlots, TContext>,
    extraContext?: (rendered: Partial<SlotValues<FileSlots<I, TSlots, TContext>>>) => Partial<TContext>,
  ) {
    const template = async (options: Options<I, SlotsWithContext<I, TSlots, TContext>>) => {
      try {
        const { outputDirectory, relativeTo, input } = {
          outputDirectory: process.cwd(),
          ...options,
        };
        const absoluteTemplateRelativeTo = path.resolve(relativeTo ?? path.dirname(templateFile));
        const cleanTemplateFile = templateFile.replace(/^file:\/\//g, '');
        const relativeOutputPath = getOutputNameFromTemplateName(cleanTemplateFile).slice(
          absoluteTemplateRelativeTo.length + 1,
        );
        const { slots: _slots, ...restOpts } = options;
        const {
          content,
          path: renderedPath,
          copyOf,
        } = await renderSlots(slots, async (rendered) => {
          const ctx = extraContext?.(rendered);
          return {
            input,
            slots: lazy(
              await renderSlots({ ...this.parentSlots, ...options.slots }, () => ({
                input,
                overwrite: false,
                slots: lazy({
                  ...this.parentSlots,
                  ...options.slots,
                }),
                ...restOpts,
                outputFile: relativeOutputPath,
                outputDirectory,
                inherited: undefined,
                relativeTo: relativeTo ? absoluteTemplateRelativeTo : path.dirname(templateFile),
                ...ctx,
              })),
            ),
            overwrite: false,
            ...restOpts,
            outputDirectory,
            outputFile: relativeOutputPath,
            inherited: undefined,
            relativeTo: relativeTo ? absoluteTemplateRelativeTo : path.dirname(templateFile),
            ...ctx,
          };
        });
        const hasContent = (typeof content === 'string' && content.length > 0) || copyOf;
        return results(
          hasContent
            ? [
                new FileEffect({
                  path: renderedPath
                    ? path.resolve(outputDirectory, renderedPath)
                    : path.resolve(outputDirectory, relativeOutputPath),
                  content: typeof content === 'string' ? await pretty(content, relativeOutputPath) : content,
                  copyOf: copyOf ? path.resolve(relativeTo ?? '', copyOf) : undefined,
                }),
              ]
            : [],
        );
      } catch (err) {
        error('executing template', templateFile);
        throw err;
      }
    };
    template.slots = this.parentSlots!;
    return template;
  }

  text(slots: FileSlots<I, TSlots>) {
    const stack = callsite();
    const templateFile = stack[1].getFileName();
    const template = this.template(templateFile, slots);
    return template;
  }

  script(slots: FileSlots<I, TSlots, Context<I, TSlots> & { imports: Imports }>) {
    const stack = callsite();
    const templateFile = stack[1].getFileName();
    const template = this.template<Context<I, TSlots> & { imports: Imports }>(templateFile, slots, (slots) => ({
      imports: path ? imports(() => slots.path!) : imports(),
    }));
    return template;
  }

  slots<TNewSlots extends Slots<I>>(slots: TNewSlots) {
    return new Plate<I, TNewSlots>(slots);
  }

  input<TNewInput>() {
    return new Plate<TNewInput, TSlots>();
  }

  group(grouping: Group<I>) {
    return async (options: Options<I, TSlots>) => {
      const groupingResults = await Promise.all(grouping(options)?.map((template) => template(options)));
      return results(groupingResults.map((r) => r.files).flat());
    };
  }
}
export const template = <TInput = null>() => new Plate<TInput>();
