# sha256-wasm
## Usage
```js
const sha256 = require('sha256-wasm')

if (!Sha256.SUPPORTED) {
  console.log('WebAssembly not supported by your runtime')
}

var hash = sha256()
  .update('hello')
  .update(' ')
  .update(Buffer.from('world'))
  .digest('hex')

console.log('Sha256 hash of "hello world" is ', hash)
// b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

## API
#### `const hash = sha256()`

Create a new hash instance.

#### `hash.update(data, [enc])`

Update the hash with a new piece of data. `data` may be passed as a buffer, uint8array or a string. If `data` is passed as a string, then it will be interpreted as a `utf8` string unless `enc` specifies an encoding.

Supported `enc`s are:
- `utf8` / `utf-8` (defualt)
- `hex`
- `base64`

#### `hash.digest([enc])`

Digest the hash. If `enc` is specified, then the digest shall be returned as an `enc` encoded string. Otherwise a buffer is returned.

Supported `enc`s are:
- `utf8` / `utf-8` (defualt)
- `hex`
- `base64`

#### `var promise = sha256.ready([cb])`

Wait for the WASM code to load. Returns the WebAssembly instance promise as well for convenience.
You have to call this at least once before instantiating the hash.

## Contributing

The bulk of this module is implemented in WebAssembly in the [sha256.wat](sha256.wat) file. To build the thin Javascript wrapper do:

```
npm run compile
```

## License

MIT
