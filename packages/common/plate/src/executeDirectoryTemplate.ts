//
// Copyright 2022 DXOS.org
//
import flatten from 'lodash.flatten';
import minimatch from 'minimatch';
import * as path from 'path';
import readDir from 'recursive-readdir';

import {
  executeFileTemplate,
  TemplatingResult,
  isTemplateFile,
  TEMPLATE_FILE_IGNORE,
  LoadTemplateOptions
} from './executeFileTemplate';
import { File } from './file';
import { logger } from './logger';
import { runPromises } from './runPromises';
import { Config, loadConfig } from './config';
import { inquire } from './zodInquire';
import { includeExclude } from './includeExclude';

export type ExecuteDirectoryTemplateOptions<TInput> = LoadTemplateOptions &
  Config & {
    templateDirectory: string;

    outputDirectory: string;
    input?: Partial<TInput>;

    parallel?: boolean;
    verbose?: boolean;
    overwrite?: boolean;
    interactive?: boolean;
  };

export const executeDirectoryTemplate = async <TInput>(
  options: ExecuteDirectoryTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const { templateDirectory, outputDirectory } = options;
  const mergedOptions = {
    parallel: true,
    verbose: false,
    interactive: true,
    ...(await loadConfig(templateDirectory)),
    ...options
  };
  const { parallel, verbose, interactive, overwrite, inputShape, include, exclude, ...restOptions } = mergedOptions;
  const debug = logger(verbose);
  debug(mergedOptions);
  let input = mergedOptions.input;
  if (inputShape) {
    const parse = inputShape.safeParse(input);
    if (!parse.success && !interactive) throw new Error(parse.error.toString());
    const inquired = await inquire(inputShape, {
      defaults: input
    });
    const inquiredParsed = inputShape.safeParse(inquired);
    if (!inquiredParsed.success) throw new Error(inquiredParsed.error.toString());
    input = inquiredParsed.data as TInput;
  }
  debug({input});
  const allFiles = await readDir(templateDirectory);
  const filteredFiles = includeExclude(allFiles, { include, exclude });
  const templateFiles = filteredFiles.filter(isTemplateFile);
  const regularFiles = filteredFiles.filter((file) => !isTemplateFile(file));
  debug(`${templateFiles.length} template files:`);
  debug(templateFiles.join('\n'));
  debug(`${regularFiles.length} regular files:`);
  debug(regularFiles.join('\n'));
  debug('executing templates...');
  const templatingPromises = templateFiles?.map((t) =>
    executeFileTemplate({
      ...restOptions,
      templateFile: path.relative(templateDirectory, t),
      templateRelativeTo: templateDirectory,
      input,
      overwrite,
    })
  );
  const runner = runPromises({
    before: (_p, i) => {
      debug(`${templateFiles[Number(i)]} ... `);
    },
    after: (_p, i) => {
      debug(`${templateFiles[Number(i)]} done`);
    }
  });
  const templateOutputs = await (parallel
    ? runner.inParallel(templatingPromises)
    : runner.inSequence(templatingPromises));
  debug('templates executed.');
  const stringPath = (p: string | string[]) => (typeof p === 'string' ? p : path.join(...p));
  const isOverwrittenByTemplateOutput = (f: string): boolean => {
    return templateOutputs.some((files) => files.some((file) => !!file && stringPath(file.path) === f));
  };
  return [
    ...regularFiles
      ?.filter((f) => !isOverwrittenByTemplateOutput(f))
      .map(
        (r) =>
          new File({
            path: path.join(outputDirectory, r.slice(templateDirectory.length).replace(/\/$/, '')),
            copyFrom: r,
            overwrite
          })
      ),
    ...flatten(templateOutputs)
  ];
};
