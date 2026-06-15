//
// Copyright 2026 DXOS.org
//

import { type PointerInfo } from '@babylonjs/core';

import { type ToolContext } from './tool-context';

/** Lifecycle interface for a tool plugin. */
export interface Tool {
  /** Unique tool identifier. */
  readonly id: string;
  /** Called when tool becomes the active tool. */
  activate(ctx: ToolContext): void;
  /** Called when tool is deactivated. Clean up any visual state. */
  deactivate(ctx: ToolContext): void;
  /** Handle pointer down. Return true if the event was consumed (disables camera). */
  onPointerDown(ctx: ToolContext, info: PointerInfo): boolean;
  /** Handle pointer move. Return true if consumed. */
  onPointerMove(ctx: ToolContext, info: PointerInfo): boolean;
  /** Handle pointer up. Return true if consumed. */
  onPointerUp(ctx: ToolContext, info: PointerInfo): boolean;
}
