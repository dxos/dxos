<!-- TODO(nf): auto-generate this section using an issue label? -->

# Known Issues

The following issues are known to affect usability:

*   [Firefox browser does not work](https://github.com/dxos/dxos/issues/3551)

# Stability and Security

The DXOS platform and SDK is currently in a technology preview state.

This means:

*   Persistence, integrity, or confidentiality of user data is not guaranteed.
*   Protocols, libraries, and SDKs are likely to change, so DXOS SDK components should not yet be used for production.
*   Security of the platform and SDK is immature and incomplete. Identity and device authentication is verified using strong encryption. Data is encrypted in transit. Data stored locally, in-browser, in [OPFS](https://fs.spec.whatwg.org/#origin-private-file-system) or [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) may not be encrypted.

# Performance, Reliability, and Scale: Current state
## Cold Start
On startup, all mutations must be loaded before the space is available to use.

**Browser: 35k mutations/sec**

**Agent: 50k mutations/sec**

Under normal conditions, a space will have 5,000 or less mutations, so cold startup time will be **less than a second**.

## Replication
Changes to a space need to be replicated to peers. When sharing a space to a new peer, or when a peer comes back online, it must receive all mutations.

**Browser: 800 mutations/sec**

**Agent: 1300 mutations/sec**

**1 MB/s throughput.**

Under normal conditions, full replication will take **10 seconds** or less.

## Reliability and Scalability
Our current limitation for scale and reliability is a combination of two factors: the number of users and the number of spaces shared.

With a nominal amount of continuous activity (400 mutations/sec), our communications protocol can handle a maxmimum of 40 connections.

For example, 10 users could share four spaces, or 4 users could share 10 spaces.


# License

MIT License
Copyright (c) 2023 DXOS

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
