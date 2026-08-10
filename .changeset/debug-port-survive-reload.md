---
'@dxos/client': minor
---

The agent debug port can now survive a reload of the tab it was authorized in. `start({ persist: true })` records the session in `sessionStorage`, and `resume()` restarts the loop under the same id, so an agent's session id keeps working across a navigation the user did not intend to end it — an OAuth redirect above all, which previously stranded the investigation exactly when the interesting state appeared.

Deliberately narrow: `sessionStorage`, not `localStorage`, so an arbitrary-eval port cannot outlive its tab; a 30-minute expiry so a forgotten port lapses on its own; `resume()` never mints a session, so mounting the devtools hook cannot switch the port on; and stopping clears the record.
