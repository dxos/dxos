//
// Copyright 2022 DXOS.org
//

import React from 'react';

export const CalendarFrame = React.lazy(() => import('./Calendar'));
export const ChessFrame = React.lazy(() => import('./Chess'));
export const ExplorerFrame = React.lazy(() => import('./Explorer'));
export const FileFrame = React.lazy(() => import('./File'));
export const KanbanFrame = React.lazy(() => import('./Kanban'));
export const MapFrame = React.lazy(() => import('./Map'));
export const NoteFrame = React.lazy(() => import('./Note'));
export const SandboxFrame = React.lazy(() => import('./Sandbox'));
export const SketchFrame = React.lazy(() => import('./Sketch'));
export const StackFrame = React.lazy(() => import('./Stack'));
export const TableFrame = React.lazy(() => import('./Table'));
export const TaskFrame = React.lazy(() => import('./Task'));

// TODO(burdon): Experimental.
export const Document = {
  Frame: React.lazy(() => import('./Document/DocumentFrame')),
  Tile: React.lazy(() => import('./Document/DocumentTile'))
};
