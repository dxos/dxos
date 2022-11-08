//
// Copyright 2022 DXOS.org
//
import flatten from 'lodash.flatten';
import * as path from 'path';
import readDir from 'recursive-readdir';
import minimatch from 'minimatch';

import {
  executeFileTemplate,
  TemplatingResult,
  isTemplateFile,
  TEMPLATE_FILE_IGNORE,
  TemplateFunctionResult
} from './executeFileTemplate';
import { File } from './file';

export const TEMPLATE_DIRECTORY_IGNORE = [...TEMPLATE_FILE_IGNORE, /\/lib\//, /index(\.d)?\.[tj]s/];

export type ExecuteDirectoryTemplateOptions<TInput> = {
  templateDirectory: string;
  outputDirectory: string;
  input?: Partial<TInput>;
  filterGlob?: string;
  filterRegEx?: RegExp;
  filterExclude?: RegExp;
};

export const executeDirectoryTemplate = async <TInput>(
  options: ExecuteDirectoryTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const { templateDirectory, filterRegEx, filterExclude, outputDirectory, input, filterGlob } = options;
  console.debug(options);
  const allFiles = (await readDir(templateDirectory)).filter(
    (file) =>
      !TEMPLATE_DIRECTORY_IGNORE.some((pattern) => pattern.test(file)) &&
      (!!filterGlob ? minimatch(file, filterGlob) : !!filterRegEx ? filterRegEx.test(file) : true) &&
      (!!filterExclude ? !filterExclude.test(file) : true)
  );
  const templateFiles = allFiles.filter(isTemplateFile);
  const regularFiles = allFiles.filter((file) => !isTemplateFile(file));
  console.debug(`${templateFiles.length} template files:`);
  console.debug(templateFiles.join('\n'));
  console.debug(`${regularFiles.length} regular files:`);
  console.debug(regularFiles.join('\n'));
  console.debug(`executing templates...`);
  const templatingPromises = templateFiles?.map((t) =>
    executeFileTemplate({
      templateFile: path.relative(templateDirectory, t),
      templateRelativeTo: templateDirectory,
      outputDirectory,
      input
    })
  );
  const templateOutputs: TemplatingResult[] = [];
  for (let index in templatingPromises) {
    const promise = templatingPromises[index];
    process.stdout.write(`executing: ${templateFiles[index]} ... `);
    templateOutputs.push(await promise);
    process.stdout.write(`OK\n`);
  }
  console.debug(`templates executed.`);
  const stringPath = (p: string | string[]) => (typeof p === 'string' ? p : path.join(...p));
  const isOverwrittenByTemplateOutput = (f: string): boolean => {
    return templateOutputs.some((files) => files.some((file) => stringPath(file.path) === f));
  };
  return [
    ...regularFiles
      ?.filter((f) => !isOverwrittenByTemplateOutput(f))
      .map(
        (r) =>
          new File({
            path: path.join(outputDirectory, r.slice(templateDirectory.length)),
            copyFrom: r
          })
      ),
    ...flatten(templateOutputs)
  ];
};
