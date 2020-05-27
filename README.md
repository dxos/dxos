# Graphical Elementary Modules

Playground for visualization components.

[![Netlify Status](https://api.netlify.com/api/v1/badges/41ea6a00-5167-472a-87fa-473758cc25f7/deploy-status)](https://app.netlify.com/sites/dxos-gem/deploys)


## Usage

NOTE: Requires Node version 12.

```bash
yarn
yarn build
yarn test
```


### Publishing to npm

We are using `beta` channel for publishing.
To publish new versions of all public packages:

```bash
yarn build
yarn test
yarn lerna publish prerelease --dist-tag="beta" --force-publish
```


## Related

- https://github.com/danielktaylor/fabric-js-editor

- https://www.npmjs.com/package/react-d3
- https://observablehq.com/@d3/histogram
- https://observablehq.com/@d3/disjoint-force-directed-graph
- https://www.npmjs.com/package/react-d3-graph
- https://www.npmjs.com/package/react-calendar
- https://stephenchou1017.github.io/scheduler
- https://engineering.flipboard.com/2015/02/mobile-web (react-canvas)
- https://medium.com/@dan_abramov/the-future-of-drag-and-drop-apis-249dfea7a15f
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
- https://onsen.io/react
