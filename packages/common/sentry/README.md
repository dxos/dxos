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
