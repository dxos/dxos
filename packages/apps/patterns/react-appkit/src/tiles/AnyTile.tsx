//
// Copyright 2023 DXOS.org
//

import { renderIfFallbackTile } from './FallbackTile';
import { renderIfTaskListTile } from './TaskListTile';
import { renderIfTaskTile } from './TaskTile';

export const AnyTile = (o: any) => renderIfTaskListTile(o) || renderIfTaskTile(o) || renderIfFallbackTile(o);
