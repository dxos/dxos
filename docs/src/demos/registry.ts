//
// Copyright 2026 DXOS.org
//

import { type Demo } from './Demo.ts';
import { DiagramDemo } from './diagram/index.ts';
import { EditorDemo } from './editor/index.ts';
import { ExplorerDemo } from './explorer/index.ts';
import { ViewsDemo } from './views/index.ts';

/** Every demo, by id; the page decides which appear and in what order. */
export const DEMOS: Record<string, Demo> = Object.fromEntries(
  [DiagramDemo, EditorDemo, ExplorerDemo, ViewsDemo].map((demo) => [demo.id, demo as Demo]),
);
