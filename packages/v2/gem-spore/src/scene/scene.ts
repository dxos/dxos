//
// Copyright 2021 DXOS.org
//

import { EventHandle } from '@dxos/gem-core';

import { Projector } from './projector';
import { Renderer } from './renderer';

export type ObjectId = string

/**
 * Component wihtin a scene.
 */
export class Part<MODEL, LAYOUT> {
  _updateListener: EventHandle | undefined;

  constructor (
    private readonly _projector: Projector<MODEL, LAYOUT>,
    private readonly _renderer: Renderer<LAYOUT>
  ) {}

  update (model: MODEL) {
    this._projector.update(model);
  }

  start () {
    // Listen for projector updates.
    this._updateListener = this._projector.updated.on(({ layout, options }) => {
      this._renderer.update(layout, options);
    });

    this._projector.start();
  }

  async stop () {
    await this._projector.stop();

    this._updateListener?.();
    this._updateListener = undefined;
  }
}

/**
 * Manages a collection of parts.
 */
export class Scene<MODEL> {
  constructor (
    private readonly _parts: Part<MODEL, any>[]
  ) {}

  update (model: MODEL) {
    this._parts.forEach(part => part.update(model));
  }

  start () {
    this._parts.forEach(part => part.start());
  }

  stop () {
    return Promise.all(this._parts.map(part => part.stop()));
  }
}
