# @dxos/model-factory
> Model factory.

![npm (scoped)](https://img.shields.io/npm/v/@dxos/model-factory)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

## Install

```
$ npm install @dxos/model-factory
```

## Usage

...

## API

#### `const modelFactory = new ModelFactory(feedStore, [options])`

- `feedStore`: A [FeedStore](https://github.com/dxos/feed-store) instance.
- `options`:
  - `onAppend: (message: Object, options: Object) => Promise`: Hook to append model messages to external interfaces.
  - `onMessage: (message: Object, options: Object) => Promise<Message|undefined>`: Function to map incoming messages.

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
