//
// Copyright 2026 DXOS.org
//

/**
 * `{{path}}` placeholders: the expression syntax shared by trigger input templates and ECHO property templates.
 */
const PLACEHOLDER = /\{\{([^{}]+)\}\}/g;

const WHOLE_PLACEHOLDER = /^\{\{([^{}]+)\}\}$/;

/**
 * Returns the path of a value that is exactly one `{{path}}` placeholder, e.g. `'{{event.item}}'` → `'event.item'`.
 * A whole-value placeholder resolves to the raw value rather than to its string form.
 */
export const parseTemplatePlaceholder = (value: string): string | undefined => WHOLE_PLACEHOLDER.exec(value)?.[1];

/**
 * Replaces every `{{path}}` placeholder in `template` with the value `resolve` returns for its path.
 * Scalars are stringified; anything else (including `undefined`) renders as an empty string.
 */
export const renderTemplate = (template: string, resolve: (path: string) => unknown): string =>
  template.replace(PLACEHOLDER, (_match, path: string) => {
    const value = resolve(path.trim());
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'bigint':
        return String(value);
      default:
        return '';
    }
  });
