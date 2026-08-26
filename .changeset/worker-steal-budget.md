---
'@dxos/worker-framework': patch
---

Bound leader-lock stealing so one wedged tab can no longer restart every other tab's worker. A tab whose coordinator link has died never receives a heartbeat, so it judged the (healthy) leader stale and stole the lock on every port timeout — terminating the leader's worker every ~16s indefinitely, and in the worst case failing a boot outright. Steals are now capped per streak (reset on a successful port exchange), escalate once through `onPersistentFailure` when exhausted, and the stealer re-enters election instead of evicting the incumbent and handing the lock straight back. A leader that releases the lock cleanly also re-enters election rather than dropping out of the wait queue for good.
