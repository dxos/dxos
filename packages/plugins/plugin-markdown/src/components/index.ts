//
// Copyright 2023 DXOS.org
//

import React, { type LazyExoticComponent } from 'react';

import { type DocumentEditor as DocumentEditorType } from './DocumentEditor';

export { type DocumentCardProps, type DocumentItemProps } from './DocumentCard';

export * from './DocumentCard';
export * from './DocumentEditor';
export * from './MarkdownEditor';
export * from './HeadingMenu';
export * from './Layout';
export * from './MarkdownSettings';

// Lazily load components for content surfaces.
export const DocumentCard = React.lazy(() => import('./DocumentCard'));
export const DocumentEditor: LazyExoticComponent<DocumentEditorType> = React.lazy(() => import('./DocumentEditor'));
export const MarkdownEditor = React.lazy(() => import('./MarkdownEditor'));
