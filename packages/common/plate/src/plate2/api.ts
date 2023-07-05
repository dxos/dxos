//
// Copyright 2023 DXOS.org
//
import callsite from 'callsite';
import path from 'path';

import { InquirableZodType } from '..';
import { InteractiveDirectoryTemplate, InteractiveDirectoryTemplateOptions } from './InteractiveDirectoryTemplate';
import { FileSlots, FileEffect } from './util/file';
import { Optional } from './util/optional';
import {
  Context,
  Template,
  Options,
  Slots,
  results,
  renderSlots,
  getOutputNameFromTemplateName
} from './util/template';

export type Group<I = any> = (context: Options<I, any>) => Template<I, any>[];

export class TemplateFactory<I = null, TSlots extends Slots<I> = {}> {
  constructor(private parentSlots?: TSlots) {}

  text(slots: FileSlots<I, TSlots>): Template<I, TSlots> & { slots: TSlots } {
    const stack = callsite();
    const templateFile = stack[1].getFileName();
    const template = async (options: Options<I, TSlots>) => {
      const { outputDirectory, relativeTo } = {
        outputDirectory: process.cwd(),
        ...options
      };
      const absoluteTemplateRelativeTo = path.resolve(relativeTo ?? '');
      const relativeOutputPath = getOutputNameFromTemplateName(templateFile).slice(
        absoluteTemplateRelativeTo.length + 1
      );
      const context: Context<I, TSlots> = {
        input: {} as I,
        slots: this.parentSlots ?? ({} as TSlots),
        overwrite: false,
        ...options,
        outputDirectory,
        outputFile: relativeOutputPath,
        inherited: undefined,
        relativeTo: relativeTo ? absoluteTemplateRelativeTo : path.dirname(templateFile)
      };
      const { content, path: p, copyOf } = await renderSlots(slots, context);
      return results([
        new FileEffect({
          path: p ?? getOutputNameFromTemplateName(path.basename(templateFile)),
          content,
          copyOf
        })
      ]);
    };
    template.slots = this.parentSlots!;
    return template;
  }

  // ecmascript(slots: FileSlots<I, TSlots>): Template<I, TSlots> {
  //   return async (context: Context<I>) => {
  //     const imports = new Imports();
  //     const effects: FileEffect[] = []; // ? compute results here
  //     return results(effects);
  //   };
  // }

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
    ...rest
  });
};
