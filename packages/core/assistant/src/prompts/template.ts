//
// Copyright 2025 DXOS.org
//

import handlebars from 'handlebars';

import { invariant } from '@dxos/invariant';

export const createTemplate = (template: string): HandlebarsTemplateDelegate => {
  invariant(template);

  let section = 0;
  handlebars.registerHelper('section', () => String(++section));
  return handlebars.compile(template);
};
