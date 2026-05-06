# Translations

Translations are keyed at **two** levels: by **typename** for object-shaped strings, and by `meta.id` for plugin-scoped strings.

```ts
// src/translations.ts
import { type Resource } from '@dxos/react-ui';
import { meta } from '#meta';
import { Foo } from '#types';

export const translations = [
  {
    'en-US': {
      [Foo.Thing.typename]: {
        'typename.label': 'Thing',
        'typename.label_zero': 'Things',
        'typename.label_one': 'Thing',
        'typename.label_other': 'Things',
        'object-name.placeholder': 'New thing',
        'add-object.label': 'Add thing',
        'rename-object.label': 'Rename thing',
        'delete-object.label': 'Delete thing',
        'object-deleted.label': 'Thing deleted',
      },
      [meta.id]: {
        'plugin.name': 'Foo',
        'do-something.button': 'Do something',
      },
    },
  },
] as const satisfies Resource[];
```

## Usage

In containers and components, scope the translation hook to your plugin id:

```tsx
import { useTranslation } from '@dxos/react-ui';
import { meta } from '#meta';

const { t } = useTranslation(meta.id);
return <Button>{t('do-something.button')}</Button>;
```

Object-shaped strings (`typename.label`, `add-object.label`, etc.) are resolved automatically by Composer when it renders chrome around your objects — you usually don't reference them directly.

## Registration

```tsx
AppPlugin.addTranslationsModule({ translations });
```
