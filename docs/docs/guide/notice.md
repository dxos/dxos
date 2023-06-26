<!-- TODO(nf): auto-generate this section using an issue label? -->
# Known Issues
The following issues are known to affect usability:

* [Firefox browser does not work](https://github.com/dxos/dxos/issues/3551)

# Stability and Security

The DXOS platform and SDK is currently in a technology preview state.

This means:
* Persistence, integrity, or confidentiality of user data is not guaranteed.
* Protocols, libraries, and SDKs are likely to change, so DXOS SDK components should not yet be used for production.
* Security of the platform and SDK is immature and incomplete. Identity and device authentication is verified using strong encryption. Data is encrypted in transit. Data stored locally, in-browser, in [OPFS](https://fs.spec.whatwg.org/#origin-private-file-system) or [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) may not be encrypted.

# License
MIT License
Copyright (c) 2023 DXOS

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
