//
// Copyright 2022 DXOS.org
//

import React from 'react';

export const CalendarFrame = React.lazy(() => import('./Calendar'));
export const ChessFrame = React.lazy(() => import('./Chess'));
export const DocumentFrame = React.lazy(() => import('./Document'));
export const ExplorerFrame = React.lazy(() => import('./Explorer'));
export const FileFrame = React.lazy(() => import('./File'));
export const MapFrame = React.lazy(() => import('./Map'));
export const NoteFrame = React.lazy(() => import('./Note'));
export const SandboxFrame = React.lazy(() => import('./Sandbox'));
export const SketchFrame = React.lazy(() => import('./Sketch'));
export const StackFrame = React.lazy(() => import('./Stack'));
export const TableFrame = React.lazy(() => import('./Table'));
export const TaskFrame = React.lazy(() => import('./Task'));

export const Kanban = {
  Frame: React.lazy(() => import('./Kanban/KanbanFrame')),
  Tile: React.lazy(() => import('./Kanban/KanbanTile'))
};
