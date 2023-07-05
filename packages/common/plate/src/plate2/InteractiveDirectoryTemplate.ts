//
// Copyright 2023 DXOS.org
//

import { z, InquirableZodType } from '..';
import { DirectoryTemplate, DirectoryTemplateOptions } from './DirectoryTemplate';

export interface InteractiveDirectoryTemplateOptions<IShape extends InquirableZodType>
  extends DirectoryTemplateOptions<z.infer<IShape>> {
  inputShape: IShape;
  inputQuestions?: any;
}

export class InteractiveDirectoryTemplate<I extends InquirableZodType> extends DirectoryTemplate<z.infer<I>> {
  public readonly inputShape: I;
  constructor(public override readonly options: InteractiveDirectoryTemplateOptions<I>) {
    super(options);
    this.inputShape = options.inputShape;
  }
}

export const executeDirectoryTemplate = <IShape extends InquirableZodType>(
  context: InteractiveDirectoryTemplateOptions<IShape>
) => {};
