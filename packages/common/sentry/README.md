# Sentry

## Usage

```ts
import * as Sentry from '@dxos/sentry';

...

// Breadcrumbs added prior to an exception are available in Sentry as context for an exception.
//   https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/
Sentry.addBreadcrumb(context);

...

// Send caught exceptions to Sentry.
Sentry.captureException(error);
```

### Logging

When Sentry is enabled all logs end up pointing their callsite back to Sentry code, which isn't helpful.
Fortunately there is a way to work around this by using the Ignore List in devtools settings:

![image](https://user-images.githubusercontent.com/4529818/215211404-b205516b-373a-4585-b415-03af1ca186c3.png)

Add `instrument.js` and `/@sentry/` to this list and they will no longer be listed as callsites for logs.

Source: https://github.com/getsentry/sentry-react-native/issues/794
