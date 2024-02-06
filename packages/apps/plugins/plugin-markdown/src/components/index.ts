//
// Copyright 2023 DXOS.org
//

import React, { type LazyExoticComponent } from 'react';

import { type DocumentMain as DocumentMainType } from './DocumentMain';
import { type DocumentSection as DocumentSectionType } from './DocumentSection';

export { type DocumentCardProps, type DocumentItemProps } from './DocumentCard';

export * from './DocumentCard';
export * from './DocumentMain';
export * from './DocumentSection';
export * from './EditorMain';
export * from './HeadingMenu';
export * from './Layout';
export * from './MarkdownSettings';

// Lazily load components for content surfaces.
export const DocumentCard = React.lazy(() => import('./DocumentCard'));
export const DocumentMain: LazyExoticComponent<DocumentMainType> = React.lazy(() => import('./DocumentMain'));
export const DocumentSection: LazyExoticComponent<DocumentSectionType> = React.lazy(() => import('./DocumentSection'));
export const EditorMain = React.lazy(() => import('./EditorMain'));
