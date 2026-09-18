---
'@dxos/test-utils': patch
---

WebKit e2e now runs against a persistent context on a Playwright whose WebKit enables OPFS off Apple platforms. WebKit serves OPFS only out of a browser data directory, which an ephemeral context lacks, and the Linux build kept `StorageAPIEnabled` off, so nothing backed by OPFS booted there. The preset also preloads an errno-preserving `sigaction` shim into Linux WebKit, whose suspend handler clobbers `errno` and aborted pages mid-test, and turns off WebKit's wasm in-place interpreter on x86_64, where boot crashes faulted. All three are off when `DX_E2E_WEBKIT_WORKAROUNDS=0`, so a Playwright upgrade can be tested without them. The suites now open the app over `127.0.0.1` rather than `localhost`, which resolves to IPv6 loopback first, where the newer Firefox fails ICE and strands every invitation.
