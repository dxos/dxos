# @dxos/i18n

Framework-agnostic [i18next](https://www.i18next.com/) instance and translation utilities.

This package owns the entire i18next lifecycle — creating the instance, initializing it, registering
resource bundles, and switching languages — so translations are available **outside of React**.

- React binds to the same instance via `<I18nextProvider i18n={i18n}>` (in `@dxos/react-ui`); it does
  not create or initialize the instance.
- Non-React code (operations, services, Effect programs) translates through the
  `AppCapabilities.Translator` capability / `TranslatorService` Effect layer, both backed by the
  `translator` exported here.

```ts
import { addResources, t } from '@dxos/i18n';

addResources([{ 'en-US': { myPlugin: { greeting: 'Hello' } } }]);
t('greeting', { ns: 'myPlugin' }); // 'Hello'
```
