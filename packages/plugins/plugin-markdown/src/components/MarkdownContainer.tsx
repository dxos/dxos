//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DocumentEditor } from './DocumentEditor';
import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';
import { DocumentType, type MarkdownSettingsProps } from '../types';

export type MarkdownContainerProps = Pick<
  MarkdownEditorProps,
  'role' | 'coordinate' | 'extensionProviders' | 'viewMode' | 'onViewModeChange'
> & {
  id: string;
  object: DocumentType | any;
  settings: MarkdownSettingsProps;
};

const MarkdownContainer = ({ id, object, ...props }: MarkdownContainerProps) => {
  if (object instanceof DocumentType) {
    return <DocumentEditor document={object} scrollPastEnd {...props} />;
  } else {
    return <MarkdownEditor id={id} initialValue={object.text} scrollPastEnd {...props} />;
  }
};

export default MarkdownContainer;
