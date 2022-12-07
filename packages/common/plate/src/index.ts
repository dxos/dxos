//
// Copyright 2022 DXOS.org
//
// export * from './file/index';
export * from './file/index';
import { File as BaseFile } from './file/index';
import { TemplateResultMetadata } from './executeFileTemplate';
export class File<R = string, M extends TemplateResultMetadata = TemplateResultMetadata> extends BaseFile<R, M> {}
export * from './config';
export * from './executeFileTemplate';
export * from './executeDirectoryTemplate';
export * from './templateLiterals';
export * from './catFiles';
export * from './executeDirectoryTemplate';
export { z } from 'zod';
