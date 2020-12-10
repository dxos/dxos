# ECHO

![](https://img.shields.io/github/license/@dxos/echo)
![Node.js Package](https://github.com/dxos/echo/workflows/Node.js%20Package/badge.svg?branch=main)
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

```typescript
const echo = new Echo();

await echo.open();
await echo.createIdentity(createKeyPair());
await echo.createHalo('your display name');

const party = await echo.createParty();

const item = await party.database.createItem({ model: ObjectModel });

await item.setProperty('foo', 'bar');
```

