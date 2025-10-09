//
// Copyright 2024 DXOS.org
//

import handlebars from 'handlebars';

import { invariant } from '@dxos/invariant';

/**
 * Process Handlebars template.
 */
export const process = <Options extends {}>(source: string, variables: Partial<Options> = {}): string => {
  invariant(typeof source === 'string');
  let section = 0;
  handlebars.registerHelper('section', () => String(++section));
  const template = handlebars.compile(source.trim());
  const output = template(variables);
  return output.trim().replace(/(\n\s*){3,}/g, '\n\n');
};
