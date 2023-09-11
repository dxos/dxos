//
// Copyright 2023 DXOS.org
//
import callsite from 'callsite';
import path from 'node:path';

import { BASENAME, DirectoryTemplateLoadOptions } from './DirectoryTemplate';
import {
  InteractiveDirectoryTemplate,
  InteractiveDirectoryTemplateOptions,
  ExecuteInteractiveDirectoryTemplateOptions,
} from './InteractiveDirectoryTemplate';
import { FileSlots, FileEffect } from './util/file';
import { imports, Imports } from './util/imports';
import { safeLoadModule } from './util/loadModule';
import { Optional } from './util/optional';
import { pretty } from './util/pretty';
import {
  Context,
  Template,
  Options,
  Slots,
  results,
  renderSlots,
  getOutputNameFromTemplateName,
  RenderedSlots,
  ResultOf,
  Slot,
} from './util/template';
import { InquirableZodType } from './util/zodInquire';

export type Group<I = any> = (context: Options<I, any>) => Template<I, any>[];

export type SlotsWithContext<I, TSlots extends Slots<I, TSlots, TContext>, TContext extends Context<I, TSlots>> = {
  [slotKey in keyof TSlots]: Slot<ResultOf<TSlots[slotKey]>, I, TSlots, TContext>;
};

export class TemplateFactory<I = null, TSlots extends Slots<I> = {}> {
  constructor(private parentSlots?: TSlots) {}

  protected template<TContext extends Context<I, TSlots> = Context<I, TSlots>>(
    templateFile: string,
    slots: FileSlots<I, TSlots, TContext>,
    extraContext?: (rendered: Partial<RenderedSlots<FileSlots<I, TSlots, TContext>>>) => Partial<TContext>,
  ) {
    const template = async (options: Options<I, SlotsWithContext<I, TSlots, TContext>>) => {
      const { outputDirectory, relativeTo } = {
        outputDirectory: process.cwd(),
        ...options,
      };
      const absoluteTemplateRelativeTo = path.resolve(relativeTo ?? path.dirname(templateFile));
      const relativeOutputPath = getOutputNameFromTemplateName(templateFile).slice(
        absoluteTemplateRelativeTo.length + 1,
      );
      const {
        content,
        path: _p,
        copyOf,
      } = await renderSlots(slots, async (rendered) => ({
        input: {} as I,
        slots: this.parentSlots
          ? await renderSlots(this.parentSlots, () => ({
              input: {} as I,
              overwrite: false,
              ...options,
              outputFile: relativeOutputPath,
              outputDirectory,
              inherited: undefined,
              relativeTo: relativeTo ? absoluteTemplateRelativeTo : path.dirname(templateFile),
              slots: {} as any,
            }))
          : ({} as any),
        overwrite: false,
        ...options,
        outputDirectory,
        outputFile: relativeOutputPath,
        inherited: undefined,
        relativeTo: relativeTo ? absoluteTemplateRelativeTo : path.dirname(templateFile),
        ...extraContext?.(rendered),
      }));
      const hasContent = (typeof content === 'string' && content.length > 0) || copyOf;
      return results(
        hasContent
          ? [
              new FileEffect({
                path: relativeOutputPath, // path.resolve(outputDirectory, relativeOutputPath),
                content: typeof content === 'string' ? pretty(content, relativeOutputPath) : content,
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
    const template = this.template(templateFile, slots, ({ path }) => ({
      imports: path ? imports(path) : imports(),
    }));
    return template;
  }

  slots<TNewSlots extends Slots<I>>(slots: TNewSlots) {
    return new TemplateFactory<I, TNewSlots>(slots);
  }

  input<TNewInput>() {
    return new TemplateFactory<TNewInput, TSlots>();
  }

  group(grouping: Group<I>) {
    return async (options: Options<I>) => {
      const groupingResults = await Promise.all(grouping(options)?.map((template) => template(options)));
      return results(groupingResults.map((r) => r.files).flat());
    };
  }
}

export type TemplateOptions<I extends InquirableZodType> = Optional<InteractiveDirectoryTemplateOptions<I>, 'src'>;

export const template = <TInput = null>() => new TemplateFactory<TInput>();

export const directory = <I extends InquirableZodType>(options: TemplateOptions<I>) => {
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
  try {
    return template.apply(options);
  } catch (err) {
    console.error(`problem in template ${src}`);
    throw err;
  }
};
