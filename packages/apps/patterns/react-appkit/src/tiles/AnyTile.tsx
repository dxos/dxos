//
// Copyright 2023 DXOS.org
//

import { renderIfFallbackTile } from './FallbackTile';
import { renderIfTaskListTile } from './TaskListTile';
import { renderIfIsTaskTile } from './TaskTile';

export const AnyTile = (o: any) => renderIfTaskListTile(o) || renderIfIsTaskTile(o) || renderIfFallbackTile(o);
