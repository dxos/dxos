//
// Copyright 2025 DXOS.org
//

import { Node } from '@dxos/plugin-graph';

/** Well-known local segment names. */
const Segments = {
  codeProjects: 'code-projects',
  spec: 'spec',
  build: 'build',
} as const;

/** Canonical segment ID for the code-projects section node. */
export const getCodeProjectsSectionId = (): string => Segments.codeProjects;

/** Canonical qualified path to the code-projects section of a space. */
export const getCodeProjectsPath = (spaceId: string): string =>
  `${Node.RootId}/${spaceId}/${Segments.codeProjects}`;

/** Canonical qualified path to a specific CodeProject within a space. */
export const getCodeProjectPath = (spaceId: string, projectId: string): string =>
  `${getCodeProjectsPath(spaceId)}/${projectId}`;

/** Canonical segment ID for the spec child node. */
export const getCodeProjectSpecId = (): string => Segments.spec;

/** Canonical segment ID for the build child node. */
export const getCodeProjectBuildId = (): string => Segments.build;
