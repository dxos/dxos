//
// Copyright 2024 DXOS.org
//

import handlebars from 'handlebars';
import defaultsDeep from 'lodash.defaultsdeep';

import { invariant } from '@dxos/invariant';

/**
 * Process Handlebars template.
 */
export const createPrompt = <Options extends {}>(source: string, options: Options = {} as Options): string => {
  invariant(source);
  let section = 0;
  handlebars.registerHelper('section', () => String(++section));
  const template = handlebars.compile(source);
  return template(defaultsDeep({}, options, { suggestions: true })).trim();
};
