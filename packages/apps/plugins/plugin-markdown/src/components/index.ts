//
// Copyright 2023 DXOS.org
//

import React, { type LazyExoticComponent } from 'react';

import type { DocumentMain as DocumentMainType } from './DocumentMain';
import type { DocumentSection as DocumentSectionType } from './DocumentSection';
import type { EditorSection as EditorSectionType } from './EditorSection';

// Lazily load components for content surfaces.
export const DocumentMain: LazyExoticComponent<DocumentMainType> = React.lazy(() => import('./DocumentMain'));
export const DocumentCard = React.lazy(() => import('./DocumentCard'));
export const DocumentSection: LazyExoticComponent<DocumentSectionType> = React.lazy(() => import('./DocumentSection'));
export const EditorMain = React.lazy(() => import('./EditorMain'));
export const EditorSection: LazyExoticComponent<EditorSectionType> = React.lazy(() => import('./EditorSection'));

export type { DocumentCardProps, DocumentItemProps } from './DocumentCard';

export * from './HeadingMenu';
export * from './Layout';
export * from './MarkdownSettings';
