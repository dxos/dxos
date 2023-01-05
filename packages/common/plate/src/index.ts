//
// Copyright 2022 DXOS.org
//
import { TemplateResultMetadata } from './executeFileTemplate';
import { File as BaseFile } from './file/index';

export * from './file/index';
export class File<R = string, M extends TemplateResultMetadata = TemplateResultMetadata> extends BaseFile<R, M> {}
export * from './util/templateLiterals';
export * from './util/zodInquire';
export * from './util/catFiles';
export * from './util/imports';
export * from './config';
export * from './executeFileTemplate';
export * from './executeDirectoryTemplate';
export { z } from 'zod';
