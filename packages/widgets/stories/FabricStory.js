//
// Copyright 2018 DxOS
//

import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { number } from '@storybook/addon-knobs';

import { fabric } from 'fabric';

import { bounds, Container, delayedListener } from '../src';
import * as d3 from 'd3';

const styles = {
  root: {
    position: 'fixed',
    display: 'flex',
    flexGrow: 1,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden'
  }
};

// TODO(burdon): Create wrapper.
// https://github.com/danielktaylor/fabric-js-editor

const nearestPow2 = n => Math.pow(2, Math.floor(Math.log(n) / Math.log(2)));

class Grid {

  // TODO(burdon): Return objects.
  create(canvas, bounds, scale) {
    const origin = {
      x: bounds.width / 2,
      y: bounds.height / 2
    };

    const min = 16;

    const d = 16 * scale;
    const s = nearestPow2(4 * scale);

    // console.log(d, scale, s);

    const lineParams = {
      selectable: false,
      strokeWidth: 1 / scale,
    };

    const stroke = i => (i === 0) ? 'darkblue' : (i % s === 0) ? '#DDD' : '#EEE';

    // TODO(burdon): Origin.
    const offset = origin.x / d;
    const max = bounds.width / 2;

    for (let i = 0; i < bounds.width / d; i++) {
      const distance = i * d;
      canvas.add(new fabric.Line([ distance, 0, distance, bounds.width ], lineParams).set({ stroke: stroke(i) }));
    }

    for (let i = 0; i < bounds.height / d; i++) {
      const distance = i * d;
      canvas.add(new fabric.Line([ 0, distance, bounds.width, distance ], lineParams).set({ stroke: stroke(i) }));
    }
  }
}

class FabricStory extends React.Component {

  static CANVAS_ID = 'canvas';

  static get props() {
    return {
      zoom: number('zoom', 0)
    };
  }

  _canvas = null;
  _fabric = null;
  _grid = new Grid();

  handleRender = delayedListener(({ width, height }) => {
    const { width: currentWidth, heightL: currentHeight } = bounds(this._canvas);
    if (width !== currentWidth || height !== currentHeight) {
      d3.select(this._canvas)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `${-width / 2}, ${-height / 2}, ${width}, ${height}`);

      this.doLayout();
    }
  });

  doLayout = () => {
    const { zoom } = this.props;

    // TODO(burdon): Lazy create.
    if (!this._fabric) {
      this._fabric = new fabric.Canvas(FabricStory.CANVAS_ID);

      const grid = 16;

      // Snap move.
      this._fabric.on('object:moving', options => {
        options.target.set({
          left: Math.round(options.target.left / grid) * grid,
          top: Math.round(options.target.top / grid) * grid
        });
      });

      // Snap resize.
      this._fabric.on('object:scaling', options => {
        const { target, transform } = options;

        const w = target.width * target.scaleX;
        const h = target.height * target.scaleY;
        const snap = { // Closest snapping points.
           top: Math.round(target.top / grid) * grid,
           left: Math.round(target.left / grid) * grid,
           bottom: Math.round((target.top + h) / grid) * grid,
           right: Math.round((target.left + w) / grid) * grid
        };
        const threshold = grid;
        const dist = { // Distance from snapping points.
           top: Math.abs(snap.top - target.top),
           left: Math.abs(snap.left - target.left),
           bottom: Math.abs(snap.bottom - target.top - h),
           right: Math.abs(snap.right - target.left - w)
        };
        const attrs = {
           scaleX: target.scaleX,
           scaleY: target.scaleY,
           top: target.top,
           left: target.left
        };

        // TODO(burdon): Show border and background while dragging.
        // https://stackoverflow.com/questions/44147762/fabricjs-snap-to-grid-on-resize
        switch (transform.corner) {
          case 'mt': {
            if (dist.top < threshold) {
              attrs.top = snap.top;
              attrs.height = snap.bottom - snap.top;
              attrs.scaleY = 1;
            }
            break;
          }
          case 'mb': {
            if (dist.bottom < threshold) {
              attrs.height = snap.bottom - snap.top;
              attrs.scaleY = 1;
            }
            break;
          }
          case 'ml': {
            if (dist.left < threshold) {
              attrs.left = snap.left;
              attrs.width = snap.right - snap.left;
              attrs.scaleX = 1;
            }
            break;
          }
          case 'mr': {
            if (dist.right < threshold) {
              attrs.width = snap.right - target.left;
              attrs.scaleX = 1;
            }
            break;
          }
        }

        target.set(attrs);
      });
    }

    // TODO(burdon): Zoom controls.

    const scale = Math.pow(2, zoom / 2);
    // console.log(zoom, scale);

    this._fabric.clear();

    this._fabric.setDimensions(bounds(this._canvas));
    this._fabric.setZoom(scale);

    this._grid.create(this._fabric, bounds(this._canvas), scale);

    const rect = new fabric.Rect({
      fill: '#EEE',
      stroke: '#666',
      left: 64,
      top: 64,
      width: 128,
      height: 64
    });

    rect.set({
      hasRotatingPoint: false
    });

    rect.setControlsVisibility({
      tl: false,
      tr: false,
      bl: false,
      br: false,
    });

    this._fabric.add(rect);
  };

  render() {
    let { classes } = this.props;

    return (
      <div className={classes.root}>
        <Container onRender={this.handleRender}>
          <canvas id={FabricStory.CANVAS_ID} ref={el => this._canvas = el}/>
        </Container>
      </div>
    );
  }
}

export default withStyles(styles)(FabricStory);
