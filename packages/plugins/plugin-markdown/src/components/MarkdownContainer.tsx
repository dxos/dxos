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

// TODO(burdon): Factor out difference for ECHO and non-ECHO objects; i.e., single component.
const MarkdownContainer = ({ id, object, settings, ...props }: MarkdownContainerProps) => {
  if (object instanceof DocumentType) {
    return <DocumentEditor document={object} settings={settings} scrollPastEnd {...props} />;
  } else {
    return <MarkdownEditor id={id} initialValue={object.text} toolbar={settings.toolbar} scrollPastEnd {...props} />;
  }
};

export default MarkdownContainer;
