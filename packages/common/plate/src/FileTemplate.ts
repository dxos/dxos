//
// Copyright 2023 DXOS.org
//
import path from 'node:path';

import { type Path } from './util/file';
import { isTemplateFile } from './util/filenames';
import { type LoadModuleOptions, loadModule } from './util/loadModule';
import { error } from './util/logger';
import { promise } from './util/promise';
import { type Slots, type Template, type FileResults, type Options } from './util/template';

export type LoadTemplateOptions = LoadModuleOptions;

export type ExecuteFileTemplateOptions<TInput, TSlots extends Slots<TInput> = Slots<TInput>> = LoadTemplateOptions &
  Options<TInput, TSlots> & {
    src: Path;
  };

export const loadTemplate = async <I = any>(p: string, options?: LoadTemplateOptions): Promise<Template<I> | null> => {
  if (!isTemplateFile(p)) {
    throw new Error(`Failed to load template. Only *.t.ts or *.t.js template files are supported. Attempted: ${p}`);
  }
  const module = await loadModule(p, options);
  const fn = module?.default ?? module;
  return typeof fn === 'function' ? fn : typeof fn === 'string' ? () => fn : null;
};

export const executeFileTemplate = async <TInput, TSlots extends Slots<TInput> = Slots<TInput>>(
  options: ExecuteFileTemplateOptions<TInput, TSlots>,
): Promise<FileResults> => {
  const { src, relativeTo } = {
    ...options,
  };
  const absoluteTemplateRelativeTo = path.resolve(relativeTo ?? '');
  const templateFullPath = path.join(absoluteTemplateRelativeTo, src);
  let templateFunction: Template<TInput> | null;
  try {
    templateFunction = await loadTemplate(templateFullPath, options);
    if (!templateFunction) {
      throw new Error('no export found in template');
    }
  } catch (err) {
    error(`problem loading template ${templateFullPath}`);
    throw err;
  }
  try {
    return promise(templateFunction(options));
  } catch (err) {
    error(`problem executing template ${templateFullPath}`);
    throw err;
  }
};
