//
// Copyright 2021 DXOS.org
//

import { EventHandle } from '@dxos/gem-core';

import { Projector } from './projector';
import { Renderer } from './renderer';

/**
 * Component wihtin a scene.
 */
export class Part<MODEL> {
  _updateListener: EventHandle | undefined;

  constructor(
    private readonly _projector: Projector<MODEL, any, any>,
    private readonly _renderer: Renderer<any, any>
  ) {}

  update(model: MODEL) {
    this._projector.update(model);
  }

  async start() {
    // Listen for projector updates.
    this._updateListener = this._projector.updated.on(({ layout }) => {
      this._renderer.update(layout);
    });

    await this._projector.start();
  }

  async stop() {
    await this._projector.stop();

    this._updateListener?.();
    this._updateListener = undefined;
  }
}

/**
 * Manages a collection of parts.
 */
export class Scene<MODEL> {
  constructor(private readonly _parts: Part<MODEL>[]) {}

  update(model: MODEL) {
    this._parts.forEach((part) => part.update(model));
  }

  start() {
    this._parts.forEach((part) => part.start());
  }

  stop() {
    return Promise.all(this._parts.map((part) => part.stop()));
  }
}
