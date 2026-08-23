//
// Copyright 2025 DXOS.org
//

/**
 * Parses an email string in the format "Name <email@example.com>" into separate name and email components.
 */
// TODO(burdon): Reconcile with packages/plugins/plugin-script/src/templates/gmail.ts
export const parseFromHeader = (value: string): { name?: string; email: string } | undefined => {
  const EMAIL_REGEX = /^([^<]+?)\s*<([^>]+@[^>]+)>$/;
  const removeOuterQuotes = (str: string) => str.replace(/^['"]|['"]$/g, '');
  const match = value.match(EMAIL_REGEX);
  if (match) {
    const [, name, email] = match;
    return {
      name: removeOuterQuotes(name.trim()),
      email: email.trim(),
    };
  }
};
