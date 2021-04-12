# Keyring

## Overview

This module provides a `Keyring` for generating, storing, and accessing cryptographic
keypairs and for signing and verifying messages with them.

## Examples

### Create and Add a Key

```
import leveldown from 'leveldown';
import {  Keyring, KeyStore, KeyType } from '@dxos/credentials';
...

const keyring = new Keyring(new KeyStore(leveldown('./test.keyring')));
await keyring.load(); // Load all records from LevelDB.

await keyring.createKeyRecord({ type: KeyType.PSEUDONYM }));
console.log(keyring.pseudonym);
```

### Add a Public Key
```
await keyring.addPublicKey({ publicKey, type: KeyType.PARTY });
console.log(keyring.findKey({ type: KeyType.PARTY }));
```

### Sign and Verify a Message
```
const message = { a: 'A', b: 'B', c: 'C' };
const signed = Keyring.sign(message, keyring.pseudonym);

assert(Keyring.verify(signed));
```

### Save a Keyring
```
const encrypted = encrypt(keyring.toJSON(), 'test-secret-password');
fs.writeFileSync('/tmp/test.keyring', encrypted);
```

### Restore a Keyring
```
const encrypted = fs.readFileSync('/tmp/test.keyring');
const keyring = new Keyring();
await keyring.loadJSON(decrypt(serialized, 'test-secret-password'));

assert(keyring.keys);
```
