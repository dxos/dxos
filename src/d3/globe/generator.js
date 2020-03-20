//
// Copyright 2019 DxOS
//

import EventEmitter from 'events';
import defaultsDeep from 'lodash.defaultsdeep';

import { GeoUtil } from '../../index';

// Data
// https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places

export class Generator extends EventEmitter {

  static pick(collection) {
    if (collection.length) {
      return collection[Math.floor(Math.random() * collection.length)];
    } else {
      const keys = Object.keys(collection);
      const key = keys[Math.floor(Math.random() * keys.length)];
      return collection[key];
    }
  };

  _interval = 0;

  state = {
    points: [],
    lines: []
  };

  constructor(data, options) {
    super();

    this._options = defaultsDeep({}, options, {
      delay: 1000,
      maxPoints: 20,
      maxLines: 5
    });

    this.cityMap = GeoUtil.parseFeatures(data).reduce((map, value) => {
      map[value.name] = value;

      return map;
    }, {});

    this.cities = Object.keys(this.cityMap).sort();
  }

  /**
   * Initialize from array of cities, creating links.
   */
  init(cities) {
    const { points, lines } = this.state;

    let last = null;
    cities.forEach(name => {
      const city = this.cityMap[name];
      if (city) {
        points.push(city);
        if (last) {
          lines.push({ source: last, target: city });
        }
        last = city;
      }
    });

    return this;
  }

  start() {
    if (this._interval) {
      return;
    }

    const { maxLines, delay } = this._options;

    this._interval = setInterval(() => {
      const { points, lines } = this.state;

      // Create point.
      let source;
      if (Math.random() > .5) {
        source = Generator.pick(this.cityMap);
        if (!points.find(p => p.name === source.name)) {
          points.push(source);
        }
      }

      // Create link.
      if (source && Math.random() > .4) {
        const target = Generator.pick(points);
        if (source !== target) {
          if (!lines.find(l =>
            (l.source === source && l.target === target) || (l.source === target && l.target === source))) {
            lines.push({
              source,
              target
            });
          }
        }
      }

      // Remove link.
      if (lines.length > maxLines && Math.random() > .3) {
        const line = Generator.pick(lines);

        this.state.lines = lines.filter(l => l !== line);

        this.state.points = points.filter(p => {
          const current = lines.filter(l => l.source === p || l.target === p);
          return (current.length !== 1 || current[0] !== line);
        });
      }

      this.emit('update', this.state);
    }, delay);

    this.emit('update', this.state);
    return this;
  }

  stop() {
    clearInterval(this._interval);
    this._interval = 0;

    return this;
  }
}
