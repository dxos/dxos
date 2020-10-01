# ECHO

![Node.js Package](https://github.com/dxos/echo/workflows/Node.js%20Package/badge.svg?branch=master)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D8.0.0-orange.svg?style=flat-square)

ECHO (Eventually Consistent Hierarchical Objects): a decentralized database for privacy-preserving applications.


## Usage

NOTE: Requires Node version 12.

```bash
yarn
yarn build
yarn test
```


### Publishing to npm

To publish new versions of all public packages:

```bash
yarn build
yarn test
yarn lerna publish --force-publish
```
