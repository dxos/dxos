//
// Copyright 2018 DxOS
//

import * as d3 from 'd3';
import EventEmitter from 'events';

/**
 *
 */
export class Spinner extends EventEmitter {

  _timer = null;

  constructor(model, options = {}) {
    super();

    this._model = model;
    this._options = options;
  }

  get running() {
    return !!this._timer;
  }

  start() {
    if (this._timer) {
      return;
    }

    const { rotation: rotationDelta, scale: scaleDelta = 0 } = this._options;
    if (!rotationDelta && !scaleDelta) {
      return;
    }

    let last = 0;
    const tick = elapsed => {
      const scale = Math.min(5, this._model.scale + scaleDelta * elapsed);

      const delta = elapsed - last;
      last = elapsed;

      const rotation = [
        this._model.rotation[0] + (rotationDelta[0] * delta),
        this._model.rotation[1] + (rotationDelta[1] * delta),
        this._model.rotation[2] + (rotationDelta[2] * delta),
      ];

      this._model.update({
        scale,
        rotation
      }, true);
    };

    this._timer = d3.timer(tick);

    return this;
  }

  stop() {
    if (this._timer) {
      this._timer.stop();
      this._timer = null;
    }

    return this;
  }
}
