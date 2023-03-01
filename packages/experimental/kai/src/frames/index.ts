//
// Copyright 2022 DXOS.org
//

import React from 'react';

export const CalendarFrame = React.lazy(() => import('./Calendar'));
export const ChessFrame = React.lazy(() => import('./Chess'));
export const ExplorerFrame = React.lazy(() => import('./Explorer'));
export const KanbanFrame = React.lazy(() => import('./Kanban'));
export const MapFrame = React.lazy(() => import('./Map'));
export const MasonryFrame = React.lazy(() => import('./Masonry'));
export const SandboxFrame = React.lazy(() => import('./Sandbox'));
export const SketchFrame = React.lazy(() => import('./Sketch'));
export const StackFrame = React.lazy(() => import('./Stack'));
export const TableFrame = React.lazy(() => import('./Table'));
export const TaskFrame = React.lazy(() => import('./Task'));

export const Document = {
  Frame: React.lazy(() => import('./Document/DocumentFrame')),
  Tile: React.lazy(() => import('./Document/DocumentList'))
};

export const Note = {
  Frame: React.lazy(() => import('./Note/NoteFrame')),
  Tile: React.lazy(() => import('./Note/NoteList'))
};

export const File = {
  Frame: React.lazy(() => import('./File/FileFrame')),
  Tile: React.lazy(() => import('./File/FileList'))
};
