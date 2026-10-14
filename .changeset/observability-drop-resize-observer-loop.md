---
'@dxos/observability': patch
---

PostHog error tracking no longer records "ResizeObserver loop completed with undelivered notifications". The browser raises it without a stack and delivers the skipped notifications on the next frame, so there is nothing to act on. An exception event is dropped only when every exception in it is this message, and a `before_send` passed through the PostHog config still runs.
