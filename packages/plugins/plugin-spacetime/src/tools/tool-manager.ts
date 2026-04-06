//
// Copyright 2026 DXOS.org
//

import { type PointerInfo, PointerEventTypes } from '@babylonjs/core';

import { log } from '@dxos/log';

import { type ActionHandler } from './action';
import { type Tool } from './tool';
import { type ToolContext } from './tool-context';

/** Manages registered tools and dispatches pointer events to the active tool. */
export class ToolManager {
  private readonly _tools = new Map<string, Tool>();
  private readonly _actions = new Map<string, ActionHandler>();
  private _activeTool: Tool | null = null;
  private _ctx: ToolContext | null = null;

  /** Register a tool. */
  registerTool(tool: Tool): this {
    this._tools.set(tool.id, tool);
    return this;
  }

  /** Set the shared tool context. Call when Babylon scene and Manifold are ready. */
  setContext(ctx: ToolContext): void {
    this._ctx = ctx;
    if (this._activeTool && this._ctx) {
      this._activeTool.activate(this._ctx);
    }
  }

  /** Switch the active tool by id. */
  setActiveTool(id: string): void {
    const next = this._tools.get(id);
    if (!next || next === this._activeTool) {
      return;
    }
    if (this._activeTool && this._ctx) {
      this._activeTool.deactivate(this._ctx);
    }
    this._activeTool = next;
    log.info('setActiveTool', { id });
    if (this._ctx) {
      this._activeTool.activate(this._ctx);
    }
  }

  /** Get the currently active tool id. */
  get activeToolId(): string | undefined {
    return this._activeTool?.id;
  }

  /** Dispatch a Babylon pointer event to the active tool. */
  handlePointer(info: PointerInfo): boolean {
    if (!this._activeTool || !this._ctx) {
      return false;
    }

    switch (info.type) {
      case PointerEventTypes.POINTERDOWN:
        return this._activeTool.onPointerDown(this._ctx, info);
      case PointerEventTypes.POINTERMOVE:
        return this._activeTool.onPointerMove(this._ctx, info);
      case PointerEventTypes.POINTERUP:
        return this._activeTool.onPointerUp(this._ctx, info);
      default:
        return false;
    }
  }

  /** Register an action handler. */
  registerAction(handler: ActionHandler): this {
    this._actions.set(handler.id, handler);
    return this;
  }

  /** Dispatch an action by id. */
  handleAction(id: string): void {
    const handler = this._actions.get(id);
    if (!handler || !this._ctx) {
      return;
    }
    log.info('handleAction', { id });
    handler.execute(this._ctx);
  }

  /** Clean up all tools. */
  dispose(): void {
    if (this._activeTool && this._ctx) {
      this._activeTool.deactivate(this._ctx);
    }
    this._activeTool = null;
    this._ctx = null;
    this._tools.clear();
    this._actions.clear();
  }
}
