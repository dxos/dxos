# WebKit e2e workarounds

Three workarounds for bugs in Playwright's WebKit build, applied by `e2ePreset` and `setupPage` in
[`playwright.ts`](./playwright.ts). All are off when `DX_E2E_WEBKIT_WORKAROUNDS=0`.

| Workaround                             | What it is                                                                                                               | Why                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent WebKit context              | `setupPage` launches WebKit against a per-context temporary data directory instead of taking an ephemeral context.       | WebKit serves OPFS only out of a browser data directory, and an ephemeral context has none, so `navigator.storage.getDirectory()` rejects with `UnknownError` and nothing backed by OPFS boots. Chromium and Firefox serve OPFS from an ephemeral context.                                                                |
| [`errno-shim.ts`](./errno-shim.ts)     | An `LD_PRELOAD` shared object that interposes `sigaction` and restores `errno` around each handler the process installs. | `WTF::Thread::signalHandlerSuspendResume` returns from `sigsuspend` without restoring `errno`, so an errno-checked parse on a thread JavaScriptCore suspended fails: `RTCIceCandidateFields` aborts, `SyntaxError: The port number is invalid` on a valid offer, and GLib `getauxval () failed: Interrupted system call`. |
| `JSC_useWasmIPInt=false` (x86_64 only) | Turns off WebKit's wasm in-place interpreter.                                                                            | Every captured boot crash faulted in IPInt with a corrupted locals base or wasm PC.                                                                                                                                                                                                                                       |

## Why WebKit e2e needs a recent Playwright

OPFS on Linux additionally needs a WebKit build that enables it. `StorageManager.idl` is
`[EnabledBySetting=StorageAPIEnabled]`, and upstream defaults that setting — along with
`FileSystemEnabled` — to true only under `PLATFORM(COCOA)`. In older Playwright builds the interface
is compiled into the Linux WPE/GTK binary but switched off, so `navigator.storage` is `undefined`
and no context configuration reaches it: persistent, headed and `--features=+StorageAPI` all fail
identically. Playwright overrides those defaults on all platforms as of WebKit 26.6, which is why
the catalog pins a Playwright carrying it.

`--features` is not an escape hatch. Playwright forwards the argument, but its patched
`createNewPage()` gives every automation page a fresh `WebKitSettings`, so parsed features land on
an object nothing uses ([playwright#31185](https://github.com/microsoft/playwright/issues/31185)).

## Retesting after a Playwright upgrade

All three are meant to be removed. After bumping Playwright, run a WebKit e2e suite repeatedly with
them off and see whether the failures come back:

```bash
for i in $(seq 10); do
  DX_E2E_WEBKIT_WORKAROUNDS=0 PLAYWRIGHT_BROWSER=webkit moon run todomvc:e2e || break
done
```

A fixed OPFS shows up on the first run: unguarded, every WebKit test fails at boot with `OPFS storage
is unusable`. The crashes the other two guard against are intermittent, surfacing as `Page crashed`
or `Target crashed` in roughly one run in three, so ten clean runs means the upgrade has fixed those
too. Then delete `errno-shim.ts`, its test, the `JSC_useWasmIPInt` line, the persistent-context
branch in `setupPage` and this file.

A CI sample is broader but needs a way to pass the variable to the e2e job: add it to the `Test`
step's `env` in `.depot/workflows/check.yml` on a throwaway branch, dispatch Check with `only=e2e`,
and drop the branch afterwards.
