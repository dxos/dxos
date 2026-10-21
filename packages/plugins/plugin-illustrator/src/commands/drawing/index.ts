//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';

import { exportDrawing } from './export.ts';
import { importDrawing } from './import.ts';
import { list } from './list.ts';
import { render } from './render.ts';

export const drawing: Command.Command<any, any, any, any, any> = Command.make('drawing').pipe(
  Command.withDescription('Lay out diagrams from the semantic DSL and keep them as drawings in a space.'),
  Command.withSubcommands([render, importDrawing, list, exportDrawing]),
);
