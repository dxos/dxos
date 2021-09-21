# Graphical Elementary Modules

[Chromatic Storybook](https://www.chromatic.com/library?appId=6000bc9133d715002117d459)

## Usage

NOTE: Requires Node version 12.

```bash
yarn
yarn build
yarn test
```

## Dependencies.

Run `yarn version-check` to list and fix dependencies across modules.
React and Mui modules should only be defined in `devDependencies` and `peerDependencies`.


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
