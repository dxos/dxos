# Coding Style

- Strict rules and types for key (Buffer, Uint8Array, string, etc.)
    - Maintain keys as (typed) buffers (using complex collections) until needed as string. Avoid:
    - keyToString(Buffer.from(response.peerFeedKey)) 
    - __ALWAYS maintain keys in protobufs as bytes ###__

- General Typescript
    - Avoid setting properties in inline constructor arguments

- Logging
    - Use debug instead of console.log
    - Use debug('dxos:...:error') for error logging

- Testing
    - Don't create temporary files in the source tree (e.g., file store temp)

- General
    - Don't pass `this` into functions.
    - Order function parameter from lest to most invariant.
