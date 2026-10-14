# @dxos/plugin-debug

Developer debugging utilities for DXOS Composer: a floating debug panel (console, log viewer, and a
navtree over the hidden `root/debug` app-graph category), synthetic-object generation, a per-object
Debug companion, a space-objects browser, a wireframe overlay, and a transient-stats panel. The
Devtools inspector (`@dxos/plugin-devtools`) attaches its tree to the same panel.

## Agent debug port on HTTPS origins

**Settings → Debug → Agent debug port** lets a local agent evaluate code in the running app through
`.agents/skills/composer-forensics/scripts/composer-recovery.js`, which listens on
`https://127.0.0.1:9321`. An HTTPS page (a PR preview, `composer.space`, or local HTTPS) may only
reach that port over HTTPS with a certificate the browser trusts, so set one up once per machine:

```bash
brew install mkcert
```

```bash
mkcert -install
```

```bash
mkcert -cert-file .agents/skills/composer-forensics/scripts/.recovery-tls/cert.pem -key-file .agents/skills/composer-forensics/scripts/.recovery-tls/key.pem localhost 127.0.0.1
```

Then run the script with `COMPOSER_RECOVERY_HTTPS=1`. `mkcert -install` adds a local CA to the
system trust store, so a person runs it, not an agent. Without it the browser rejects the script's
self-signed fallback certificate and the session never connects.
