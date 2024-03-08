//
// Copyright 2023 DXOS.org
//
import callsite from 'callsite';
import path from 'node:path';

import {
  BASENAME,
  DirectoryTemplate,
  type DirectoryTemplateLoadOptions,
  type DirectoryTemplateOptions,
} from './DirectoryTemplate';
import {
  InteractiveDirectoryTemplate,
  type InteractiveDirectoryTemplateOptions,
  type ExecuteInteractiveDirectoryTemplateOptions,
} from './InteractiveDirectoryTemplate';
import { type FileSlots, FileEffect } from './util/file';
import { imports, type Imports } from './util/imports';
import { safeLoadModule } from './util/loadModule';
import { type Optional } from './util/optional';
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
import { type InquirableZodType } from './util/zodInquire';

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

export type TemplateOptions<I> = Optional<DirectoryTemplateOptions<I>, 'src'>;

export const directory = <I>(options: TemplateOptions<I>) => {
  const stack = callsite();
  const templateFile = stack[1].getFileName();
  const dir = path.dirname(templateFile);
  const { src, ...rest } = { src: dir, ...options };
  return new DirectoryTemplate({
    src: path.isAbsolute(src) ? src : path.resolve(dir, src),
    ...rest,
  });
};

export type InteractiveTemplateOptions<I extends InquirableZodType> = Optional<
  InteractiveDirectoryTemplateOptions<I>,
  'src'
>;

export const interactiveDirectory = <I extends InquirableZodType>(options: InteractiveTemplateOptions<I>) => {
  const stack = callsite();
  const templateFile = stack[1].getFileName();
  const dir = path.dirname(templateFile);
  const { src, ...rest } = { src: dir, ...options };
  return new InteractiveDirectoryTemplate({
    src: path.isAbsolute(src) ? src : path.resolve(dir, src),
    ...rest,
  });
};

export const loadTemplate = async <T = InteractiveDirectoryTemplate<any>>(
  src: string,
  options?: DirectoryTemplateLoadOptions,
) => {
  const tsName = path.resolve(src, BASENAME + '.ts');
  const jsName = path.resolve(src, BASENAME + '.js');
  const { verbose } = { verbose: false, ...options };
  try {
    const module = (await safeLoadModule(tsName, options))?.module ?? (await safeLoadModule(jsName, options))?.module;
    const config = { ...module?.default };
    return config as T;
  } catch (err: any) {
    if (verbose) {
      console.warn('exception while loading template config:\n' + err.toString());
    }
    throw err;
  }
};

export const executeDirectoryTemplate = async <I extends InquirableZodType>(
  options: ExecuteInteractiveDirectoryTemplateOptions<I>,
) => {
  const { src, verbose } = options;
  if (!src) {
    throw new Error('cannot load template without an src option');
  }
  const template = await loadTemplate(src, { verbose });
  if (!template) {
    throw new Error(`failed to load template function from ${src}`);
  }
  if (!(template instanceof DirectoryTemplate)) {
    throw new Error(`template is not an executable template ${src}`);
  }
  if (!template.apply) {
    throw new Error(`template does not have an apply function ${src}`);
  }
  try {
    return template.apply(options);
  } catch (err) {
    console.error(`problem in template ${src}`);
    throw err;
  }
};
