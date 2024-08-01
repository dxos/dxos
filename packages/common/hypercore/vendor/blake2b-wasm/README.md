# blake2b-wasm

Blake2b implemented in WASM

```
npm install blake2b-wasm
```

Works in browsers that support WASM and Node.js 8+.

## Usage

``` js
var blake2b = require('blake2b-wasm')

if (!blake2b.SUPPORTED) {
  console.log('WebAssembly not supported by your runtime')
}

blake2b.ready(function (err) {
  if (err) throw err

  var hash = blake2b()
    .update(Buffer.from('hello')) // pass in a buffer or uint8array
    .update(Buffer.from(' '))
    .update(Buffer.from('world'))
    .digest('hex')

  console.log('Blake2b hash of "hello world" is %s', hash)
})
```

## API

#### `var hash = blake2b([digestLength], [key], [salt], [personal])`

Create a new hash instance. `digestLength` defaults to `32`.

#### `hash.update(data)`

Update the hash with a new piece of data. `data` should be a buffer or uint8array.

#### `var digest = hash.digest([enc])`

Digest the hash.

#### `hash.getPartialHash()`

Returns the current partial hash.

#### `hash.setPartialHash(data)`

Set the hash to a previously set hash. `data` should be the result of `getPartialHash()` (which returns uint8array)

#### `var promise = blake2b.ready([cb])`

Wait for the WASM code to load. Returns the WebAssembly instance promise as well for convenience.
You have to call this at least once before instantiating the hash.

## Browser demo

There is a browser example included in [example.html](example.html) and [example.js](example.js).

## Contributing

The bulk of this module is implemented in WebAssembly in the [blake2b.wat](blake2b.wat) file. To build the thin Javascript wrapper do:

```
npm run compile
```

## License

MIT
