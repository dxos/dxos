//
// Copyright 2022 DXOS.org
//
import flatten from 'lodash.flatten';
import * as path from 'path';
import readDir from 'recursive-readdir';
import minimatch from 'minimatch';

import { executeFileTemplate, TemplatingResult, isTemplateFile, TEMPLATE_FILE_IGNORE } from './executeFileTemplate';
import { File } from './file';
import { logger } from './logger';
import { runPromises } from './runPromises';

export const TEMPLATE_DIRECTORY_IGNORE = [...TEMPLATE_FILE_IGNORE, /\.t\//, /^index(\.d)?\.[tj]s/];

export type ExecuteDirectoryTemplateOptions<TInput> = {
  templateDirectory: string;
  outputDirectory: string;
  input?: Partial<TInput>;
  parallel?: boolean;
  filterGlob?: string;
  filterRegEx?: RegExp;
  filterExclude?: RegExp;
  verbose?: boolean;
  overwrite?: boolean;
};

export const executeDirectoryTemplate = async <TInput>(
  options: ExecuteDirectoryTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const {
    templateDirectory,
    filterRegEx,
    filterExclude,
    outputDirectory,
    input,
    filterGlob,
    parallel = true,
    verbose = false,
    overwrite
  } = options;
  const debug = logger(verbose);
  debug(options);
  const allFiles = (await readDir(templateDirectory)).filter(
    (file) =>
      !TEMPLATE_DIRECTORY_IGNORE.some((pattern) => pattern.test(file)) &&
      (filterGlob ? minimatch(file, filterGlob) : filterRegEx ? filterRegEx.test(file) : true) &&
      (filterExclude ? !filterExclude.test(file) : true)
  );
  debug('all files:\n', allFiles.join('\n'));
  const templateFiles = allFiles.filter(isTemplateFile);
  const regularFiles = allFiles.filter((file) => !isTemplateFile(file));
  debug(`${templateFiles.length} template files:`);
  debug(templateFiles.join('\n'));
  debug(`${regularFiles.length} regular files:`);
  debug(regularFiles.join('\n'));
  debug('executing templates...');
  const templatingPromises = templateFiles?.map((t) =>
    executeFileTemplate({
      templateFile: path.relative(templateDirectory, t),
      templateRelativeTo: templateDirectory,
      outputDirectory,
      input,
      overwrite
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
            path: path.join(outputDirectory, r.slice(templateDirectory.length - 1)),
            copyFrom: r,
            overwrite
          })
      ),
    ...flatten(templateOutputs)
  ];
};
