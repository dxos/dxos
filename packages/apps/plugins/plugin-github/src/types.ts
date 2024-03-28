//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction } from 'react';

import { type DocumentType } from '@braneframe/types';
import {
  type GraphBuilderProvides,
  type TranslationsProvides,
  type SettingsProvides,
  type SurfaceProvides,
} from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';

export type EditorViewState = 'editor' | 'preview';

export type MarkdownDocumentProps = {
  space: Space;
  document: DocumentType;
  layout: 'standalone' | 'embedded';
  editorViewState: EditorViewState;
  setEditorViewState: Dispatch<SetStateAction<EditorViewState>>;
};

export type GhSharedProps = {
  owner: string;
  repo: string;
};

export type GhFileIdentifier = GhSharedProps & {
  ref: string;
  path: string;
};

export type GhIssueIdentifier = GhSharedProps & {
  issueNumber: number;
};

export type GhIdentifier = GhFileIdentifier | GhIssueIdentifier;

export type ExportViewState = 'create-pr' | 'pending' | 'response' | null;

export type GithubSettingsProps = {
  pat?: string;
};

export type GithubPluginProvides = SurfaceProvides &
  GraphBuilderProvides &
  SettingsProvides<GithubSettingsProps> &
  TranslationsProvides;
