//
// Copyright 2022 DXOS.org
//

import path from 'path';
// import { promises as fs } from "fs";
import * as tsnode from 'ts-node';

import { File, getFileType, MaybePromise, promise } from './file';

/** Include all template files that end with .t.ts or .t.js */
export const TEMPLATE_FILE_INCLUDE = /(.*)\.t\.[tj]s$/;
/** Do not process files that are compilation noise like .map and .t.d.ts */
export const TEMPLATE_FILE_IGNORE = [/\.t\.d\./, /\.map$/];

export const isTemplateFile = (file: string): boolean =>
  TEMPLATE_FILE_INCLUDE.test(file) && !TEMPLATE_FILE_IGNORE.some((pattern) => pattern.test(file));

export const getOutputNameFromTemplateName = (s: string): string => {
  const e = TEMPLATE_FILE_INCLUDE.exec(s);
  const out = e?.[1];
  return out ?? s;
};

const loadTemplate = async <I = any>(p: string): Promise<TemplateFunction<I>> => {
  if (!isTemplateFile(p)) {
    throw new Error(`only *.t.ts or *.t.js template files are supported. attempted file: ${p}`);
  }
  // const outpath = p.replace(/\.t\.ts$/, ".t.js");
  // TODO(wittjosiah): Make this conditional on whether the template is typescript.
  tsnode.register({
    transpileOnly: true,
    swc: true,
    skipIgnore: true,
    compilerOptions: {
      strict: false,
      target: 'es5',
      module: 'commonjs'
    }
  });
  let mod;
  try {
    mod = await import(p);
    const fn = mod?.default ?? mod;
    return typeof fn === 'function' ? fn : typeof fn === 'string' ? () => fn : null;
  } catch (err) {
    console.error(`problem while loading template ${p}`);
    console.error(err);
    throw err;
  }
};

export type ExecuteFileTemplateOptions<TInput = {}> = {
  templateFile: string;
  templateRelativeTo?: string;
  outputDirectory: string;
  input?: TInput;
  overwrite?: boolean;
};

export type TemplateContext<TInput = {}> = ExecuteFileTemplateOptions<TInput> & {
  input: TInput;
  defaultOutputFile: string;
};

export type TemplatingResult<R = any> = File<R>[];

export type TemplateFunctionResult<R = any> = string | File<R>[];

export type Functor<TInput = void, TOutput = void> = (input: TInput) => MaybePromise<TOutput>;

// a template file .t.ts exports this as default:
export type TemplateFunction<TInput = void> = Functor<TemplateContext<TInput>, TemplateFunctionResult>;

export const executeFileTemplate = async <TInput>(
  options: ExecuteFileTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const { templateFile, outputDirectory, templateRelativeTo, overwrite } = options;
  const absoluteTemplateRelativeTo = path.resolve(templateRelativeTo ?? '');
  const templateFullPath = path.join(absoluteTemplateRelativeTo, templateFile);
  const templateFunction = await loadTemplate(templateFullPath);
  if (!templateFunction) {
    return [];
  }
  const nominalOutputPath = path.join(
    outputDirectory,
    getOutputNameFromTemplateName(templateFullPath).slice(absoluteTemplateRelativeTo.length)
  );
  try {
    const result = await promise(
      templateFunction({
        input: {},
        ...options,
        defaultOutputFile: nominalOutputPath,
        ...(templateRelativeTo
          ? { templateRelativeTo: absoluteTemplateRelativeTo }
          : { templateRelativeTo: path.dirname(templateFullPath) })
      })
    );
    return typeof result === 'string'
      ? [
          new (getFileType(nominalOutputPath))({
            content: result,
            path: nominalOutputPath,
            ...(typeof overwrite !== 'undefined' ? { overwrite: !!overwrite } : {})
          })
        ]
      : result.map((outfile) => {
          if (overwrite === false) {
            outfile.allowOverwrite = false;
          }
          return outfile;
        });
  } catch (err) {
    console.error(`problem in template ${templateFullPath}`);
    throw err;
  }
};
