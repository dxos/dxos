//
// Copyright 2023 DXOS.org
//
import callsite from 'callsite';
import path from 'node:path';

import { InquirableZodType } from '..';
import { InteractiveDirectoryTemplate, InteractiveDirectoryTemplateOptions } from './InteractiveDirectoryTemplate';
import { FileSlots, FileEffect } from './util/file';
import { imports, Imports } from './util/imports';
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
} from './util/template';

export type Group<I = any> = (context: Options<I, any>) => Template<I, any>[];

export class TemplateFactory<I = null, TSlots extends Slots<I> = {}> {
  constructor(private parentSlots?: TSlots) {}

  protected template<TContext extends Context<I, TSlots> = Context<I, TSlots>>(
    templateFile: string,
    slots: FileSlots<I, TSlots, TContext>,
    extraContext?: (rendered: Partial<RenderedSlots<FileSlots<I, TSlots, TContext>>>) => Partial<TContext>,
  ) {
    const template = async (options: Options<I, TSlots>) => {
      const { outputDirectory, relativeTo } = {
        outputDirectory: process.cwd(),
        ...options,
      };
      const absoluteTemplateRelativeTo = path.resolve(relativeTo ?? '');
      const relativeOutputPath = getOutputNameFromTemplateName(templateFile).slice(
        absoluteTemplateRelativeTo.length + 1,
      );
      const {
        content,
        path: p,
        copyOf,
      } = await renderSlots(slots, (rendered) => ({
        input: {} as I,
        slots: this.parentSlots ?? ({} as TSlots),
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
                path: path.resolve(outputDirectory, relativeOutputPath),
                content: typeof content === 'string' ? pretty(content, relativeOutputPath) : content,
                copyOf: copyOf ? path.resolve(relativeTo ?? '', copyOf) : undefined
              }),
            ]
          : [],
      );
    };
    template.slots = this.parentSlots!;
    return template;
  }

  text(slots: FileSlots<I, TSlots>): Template<I, TSlots> & { slots: TSlots } {
    const stack = callsite();
    const templateFile = stack[1].getFileName();
    const template = this.template(templateFile, slots);
    return template;
  }

  script(slots: FileSlots<I, TSlots, Context<I, TSlots> & { imports: Imports }>): Template<I, TSlots> {
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

  group(grouping: Group<I>): Template<I> {
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
