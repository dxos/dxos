//
// Copyright 2023 DXOS.org
//

import chalk from 'chalk';
import path from 'node:path';
import readDir from 'recursive-readdir';
import { ZodObject, ZodObjectDef, ZodType } from 'zod';

import { executeFileTemplate } from './FileTemplate';
import { Plate } from './api';
import { Effect } from './util/effect';
import { FileEffect, Path } from './util/file';
import { filterIncludeExclude } from './util/filterIncludeExclude';
import { LoadModuleOptions } from './util/loadModule';
import { logger } from './util/logger';
import { runPromises } from './util/runPromises';
import {
  Template,
  FileResults,
  Context,
  TEMPLATE_FILE_IGNORE,
  results,
  isTemplateFile,
  Options,
} from './util/template';

export const BASENAME = 'template.t';

export type FilterExpression = string | RegExp;

export type Filter<TInput = any> = FilterExpression[] | ((input: TInput) => FilterExpression[]);

export const filter = <TInput>(fn?: Filter<TInput>, input?: Partial<TInput>) => {
  return (typeof fn === 'function' ? fn({ ...(input ?? ({} as any)) }) : fn) ?? [];
};

type Unzod<T> = { [key in keyof T]: T[key] extends ZodObjectDef ? string : T[key] };

const pretty = <T extends {}>(o: T) => {
  const r: Unzod<T> = {} as Unzod<T>;
  for (const key in o) {
    (r[key] as any) = o[key] instanceof ZodObject || o[key] instanceof ZodType ? '[ZodObject]' : o[key];
  }
  return r;
};

type IncludeExclude<I = any> = { include?: Filter<I>; exclude?: Filter<I> };

export const mergeOptions = <T extends IncludeExclude>(...array: T[]): T => {
  const merge = (a: T, b: T) => {
    const { include, exclude } = b;
    const merged = {
      ...a,
      ...b,
    };
    if (include?.length || a.include?.length) {
      if (typeof a.include === 'function' || typeof include === 'function') {
        merged.include = (input: any) => [...filter(a.include, input), ...filter(include, input)];
      } else {
        merged.include = [...(a.include ?? []), ...(include ?? [])];
      }
    }
    if (exclude?.length || a.exclude?.length) {
      if (typeof a.exclude === 'function' || typeof exclude === 'function') {
        merged.exclude = (input: any) => [...filter(a.exclude, input), ...filter(exclude, input)];
      } else {
        merged.exclude = [...(a.exclude ?? []), ...(exclude ?? [])];
      }
    }
    return merged as T;
  };
  return array.reduce(merge);
};

export type DirectoryTemplateOptions<I = any> = IncludeExclude<I> & {
  src?: Path;
  inherits?: Template<I>;
  defaultInput?: Partial<I>;
  before?: () => any;
  after?: false | ((options: Required<ExecuteDirectoryTemplateOptions<I>>, results: FileResults) => any);
  options?: (context: Required<ExecuteDirectoryTemplateOptions<I>>) => Required<ExecuteDirectoryTemplateOptions<I>>;
};

export type DirectoryTemplateContext<I> = Context<I>;

export const defaultOptions: Partial<ExecuteDirectoryTemplateOptions<any>> = {
  exclude: [/\.t\//, /node_modules/, ...TEMPLATE_FILE_IGNORE],
};

export type ExecuteDirectoryTemplateOptions<I> = Options<I> &
  DirectoryTemplateOptions<I> &
  LoadModuleOptions & {
    verbose?: boolean;
    parallel?: boolean;
  };

export class DirectoryTemplate<I = any> implements Effect<Context<I>, FileResults> {
  constructor(public options: DirectoryTemplateOptions<I>) {}

  public define = new Plate<I>();

  async apply(options?: ExecuteDirectoryTemplateOptions<I>): Promise<FileResults<I>> {
    const bareMergedOptions = mergeOptions<ExecuteDirectoryTemplateOptions<I>>(
      {
        parallel: true,
        verbose: false,
        outputDirectory: process.cwd(),
      },
      defaultOptions,
      this.options,
      options ?? {},
      {
        input: { ...this.options.defaultInput, ...options?.input },
      },
    ) as Required<ExecuteDirectoryTemplateOptions<I>>;
    const mergedOptions = bareMergedOptions?.options ? bareMergedOptions.options(bareMergedOptions) : bareMergedOptions;
    const { src, parallel, include, exclude, outputDirectory, verbose, input } = mergedOptions;
    if (!src) {
      throw new Error('a template src file is required');
    }
    if (!outputDirectory) {
      throw new Error('an output directory is required');
    }
    const debug = logger(!!verbose);
    debug(`---\n${chalk.magenta('executing template')} ${src}`);
    debug('options:', pretty(mergedOptions));
    const { inherits, src: _src, ...restOptions } = mergedOptions;
    const inherited = inherits ? await inherits({ ...restOptions, input }) : undefined;
    debug(`${inherited?.files?.length ?? 'no'} inherited results`);
    const allFiles = await readDir(
      src,
      filter(exclude, input).map((x) => (x instanceof RegExp ? (entry) => x.test(entry.replace(src, '')) : x)),
    );
    debug(`${allFiles.length} files discovered`);
    const filteredFiles = filterIncludeExclude(allFiles, {
      include: filter(include, input),
      exclude: filter(exclude, input),
      transform: (s) => s.replace(src, '').replace(/^\//, ''),
    });
    debug(`${filteredFiles.length}/${allFiles.length} files included`);
    const ignoredFiles = allFiles.filter((f) => filteredFiles.indexOf(f) < 0);
    const templateFiles = filteredFiles.filter(isTemplateFile);
    const regularFiles = filteredFiles.filter((file) => !isTemplateFile(file));
    debug(`${ignoredFiles.length} ignored files:`);
    debug(ignoredFiles.join('\n'));
    debug(`${templateFiles.length} template files:`);
    debug(templateFiles.join('\n'));
    debug(`${regularFiles.length} regular files:`);
    debug(regularFiles.join('\n'));
    debug(`executing ${templateFiles.length} template files ${parallel ? 'in parallel' : 'sequentially'}...`);
    const templatingPromises = templateFiles?.map((t) => {
      return executeFileTemplate({
        ...mergedOptions,
        outputDirectory,
        src: path.relative(src, t),
        relativeTo: src,
        input,
      });
    });
    const runner = runPromises({
      before: (_p, i) => {
        debug(`${templateFiles[Number(i)]} ....`);
      },
      after: (_p, i) => {
        debug(`${templateFiles[Number(i)]} done`);
      },
    });
    const templateOutputs = await (parallel
      ? runner.inParallel(templatingPromises)
      : runner.inSequence(templatingPromises));
    debug(`${templateOutputs.length} templating results`);
    debug(`${templateOutputs.map((o) => o.files).flat()?.length} templating results total files`);
    const isWithinTemplateOutput = (filePath: string): boolean => {
      return templateOutputs.some((out) => out.files.some((file) => !!file && file.path === filePath));
    };
    const flatOutput = [
      ...regularFiles
        ?.filter((f) => !isWithinTemplateOutput(f))
        .map(
          (r) =>
            new FileEffect({
              path: path.resolve(outputDirectory, r.slice(src.length + 1).replace(/\/$/, '')),
              copyOf: r,
            }),
        ),
      ...templateOutputs.map((f) => f.files).flat(),
    ].filter(Boolean);
    debug(`${flatOutput.length} non inherited results`);
    const inheritedOutputMinusFlatOutput = inherited
      ? inherited.files.filter((inheritedOut) => {
          return !flatOutput.find((existing) => existing.path === inheritedOut.path);
        })
      : [];
    const combined = [...inheritedOutputMinusFlatOutput, ...flatOutput].filter(Boolean);
    debug(`${combined.length} combined results`);
    debug(combined.join('\n'));
    const result = results(combined);
    debug(`done executing template ${src}\n---`);
    if (mergedOptions?.after) {
      mergedOptions?.after(mergedOptions, result);
    }
    return result;
  }
}

export type DirectoryTemplateLoadOptions = LoadModuleOptions & { verbose?: boolean };
