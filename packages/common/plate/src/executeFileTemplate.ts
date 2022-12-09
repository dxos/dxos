//
// Copyright 2022 DXOS.org
//
import path from 'path';

import { loadModule, LoadModuleOptions } from './util/loadModule';

import { File, getFileType, MaybePromise, promise } from './file';
import { Config } from './config';
import { z } from 'zod';
import { Imports } from './util/imports';

/** Include all template files that end with .t.ts or .t.js */
export const TEMPLATE_FILE_INCLUDE = /(.*)\.t\.[tj]s$/;
/** Do not process files that are compilation noise like .map and .t.d.ts */
export const TEMPLATE_FILE_IGNORE = [/\.t\.d\./, /\.map$/, /config\.t\.[tj]s$/];

export const isTemplateFile = (file: string) =>
  TEMPLATE_FILE_INCLUDE.test(file) && !TEMPLATE_FILE_IGNORE.some((pattern) => pattern.test(file));

export const getOutputNameFromTemplateName = (s: string): string => {
  const e = TEMPLATE_FILE_INCLUDE.exec(s);
  const out = e?.[1];
  return out ?? s;
};

export type LoadTemplateOptions = LoadModuleOptions;

const loadTemplate = async <I = any>(p: string, options?: LoadTemplateOptions): Promise<TemplateFunction<I> | null> => {
  if (!isTemplateFile(p)) {
    throw new Error(`only *.t.ts or *.t.js template files are supported. attempted: ${p}`);
  }
  const module = await loadModule(p, options);
  const fn = module?.default ?? module;
  return typeof fn === 'function' ? fn : typeof fn === 'string' ? () => fn : null;
};

export type ExecuteFileTemplateOptions<TInput = {}> = LoadTemplateOptions & {
  templateFile: string;
  templateRelativeTo?: string;
  outputDirectory: string;
  input?: TInput;
  overwrite?: boolean;
  inherited?: TemplatingResult;
};

export type TemplateSlotContext = {
  imports: Imports;
};

export type TemplateSlotFunction = (slotContext: TemplateSlotContext) => string;

export type SatisfiedTemplateSlotFunction = (slotContext?: TemplateSlotContext) => string;

export type TemplateSlotContent = string | TemplateSlotFunction;

export type TemplateSlotMap = Record<string, TemplateSlotContent>;

export type FunctionalMap<T extends TemplateSlotMap> = { [key in keyof T]: SatisfiedTemplateSlotFunction };

export const defineSlots = <M extends TemplateSlotMap>(map: M) => map;

export const renderSlots =
  <Map extends TemplateSlotMap>(slots?: Map) =>
  (context: TemplateSlotContext) => {
    const result: FunctionalMap<Map> = {} as FunctionalMap<Map>;
    if (slots)
      for (let i in slots) {
        const val = slots[i];
        result[i] = typeof val == 'function' ? (c?: TemplateSlotContext) => val({ ...context, ...c }) : () => val;
      }
    return result;
  };

export type TemplateContext<TInput = {}, TSlots extends TemplateSlotMap = {}> = ExecuteFileTemplateOptions<TInput> & {
  input: TInput;
  defaultOutputFile: string;
  slots?: { [key in keyof TSlots]: TemplateSlotContent };
};

export type TemplateResultMetadata = {
  templateFile?: string;
};

export type TemplatingResult<R = any> = File<R, TemplateResultMetadata>[];

export type TemplateFunctionResult<R = any> = null | string | File<R, TemplateResultMetadata>[];

export type ExtractInput<TInput> = TInput extends Config<infer U> ? z.infer<U> : TInput;
export type ExtractConfig<TInput> = TInput extends Config<any> ? TInput : never;
export type ExtractNonConfig<TInput> = TInput extends Config<any> ? never : TInput;

export const defineTemplate = <TInput = any, TSlots extends TemplateSlotMap = {}>(
  fun: TemplateFunction<ExtractInput<TInput>, TSlots>,
  options?: { slots?: TSlots; config?: ExtractConfig<TInput> }
) => (options?.slots ? (o: TemplateContext<ExtractInput<TInput>, TSlots>) => fun({ slots: options.slots, ...o }) : fun);

export type Functor<TInput = void, TOutput = void> = (input: TInput) => MaybePromise<TOutput>;

// a template file .t.ts exports this as default:
export type TemplateFunction<TInput = void, TSlots extends TemplateSlotMap = {}> = Functor<
  TemplateContext<TInput, TSlots>,
  TemplateFunctionResult
>;

export const executeFileTemplate = async <TInput>(
  options: ExecuteFileTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const { templateFile, outputDirectory, templateRelativeTo, overwrite } = options;
  const absoluteTemplateRelativeTo = path.resolve(templateRelativeTo ?? '');
  const templateFullPath = path.join(absoluteTemplateRelativeTo, templateFile);
  const templateFunction = await loadTemplate(templateFullPath, options);
  if (!templateFunction) {
    return [];
  }
  const relativeOutputPath = getOutputNameFromTemplateName(templateFullPath).slice(absoluteTemplateRelativeTo.length);
  const nominalOutputPath = path.join(outputDirectory, relativeOutputPath);
  try {
    const templateContext = {
      input: {},
      ...options,
      defaultOutputFile: nominalOutputPath,
      inherited: options.inherited,
      ...(templateRelativeTo
        ? { templateRelativeTo: absoluteTemplateRelativeTo }
        : { templateRelativeTo: path.dirname(templateFullPath) })
    };
    const result = await promise(templateFunction(templateContext));
    return result === null
      ? []
      : typeof result === 'string'
      ? [
          new (getFileType(nominalOutputPath))({
            content: result,
            path: nominalOutputPath,
            ...(typeof overwrite !== 'undefined' ? { overwrite: !!overwrite } : {}),
            metadata: {
              templateFile
            }
          })
        ]
      : result.map((outfile) => {
          if (overwrite === false) {
            outfile.allowOverwrite = false;
          }
          outfile.metadata.templateFile = templateFile;
          return outfile;
        });
  } catch (err) {
    console.error(`problem in template ${templateFullPath}`);
    throw err;
  }
};
