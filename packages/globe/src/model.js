//
// Copyright 2018 DxOS
//

import { EventEmitter } from "events";
import isEqual from 'lodash.isequal';
import defaultsDeep from 'lodash.defaultsdeep';

/**
 * Globe state.
 */
export class Model extends EventEmitter {

  static defaults = {
    offset: { x: 0, y: 0 },
    scale: 1,
    rotation: [0, 0, 0]
  };

  _state = {};

  get initialized() {
    return Object.keys(this._state).length > 0;
  }

  get offset() {
    return this._state.offset || Model.defaults.offset;
  }

  get scale() {
    return this._state.scale || Model.defaults.scale;
  }

  get rotation() {
    return this._state.rotation || Model.defaults.rotation;
  }

  set(state) {
    Object.assign(this._state, state);

    return this;
  }

  update(state, now) {
    const newState = defaultsDeep({}, state, this._state);

    if (now) {
      this.set(newState);
    }

    if (now || !isEqual(newState, this._state)) {
      this.emit('update', newState, now);
    }

    return this;
  }
}
