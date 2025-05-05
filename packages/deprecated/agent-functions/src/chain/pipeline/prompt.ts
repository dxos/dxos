//
// Copyright 2024 DXOS.org
//

import { type PipelineFunction, type PromptInput } from './pipeline';

export type Resolver = (input: PromptInput) => string | null;

export const processTemplate =
  (resolver: Resolver): PipelineFunction =>
  async ({ request, response }) => {
    const { template } = request.prompt ?? {};
    if (template) {
      const regExp = /\{([^}]+)\}/g;
      const parts = [];
      let last = 0;
      for (const match of template.matchAll(regExp)) {
        const [, name] = match;
        const input = request.prompt!.inputs?.find((input) => input.name === name);
        const value = input && resolver(input);
        if (!value) {
          throw new Error(`invalid input: ${name}`);
        }

        parts.push(template.slice(last, match.index));
        parts.push(value);
        last = match.index! + name.length + 2;
      }

      if (parts.length) {
        parts.push(template.slice(last));
        return {
          request: Object.assign(request, {
            messages: [
              {
                text: parts.join(''),
              },
            ],
          }),
        };
      }
    }

    return { request, response };
  };
