import type { ReactiveEchoObject } from '@dxos/echo-db';
import { getTypename } from '@dxos/echo-schema';
import { getSpace, ResultFormat } from '@dxos/react-client/echo';

// TODO(burdon): Move into assistant-protocol.
export type ThreadContext = {
  subject?: ReactiveEchoObject<any>;
};

export const createSystemInstructions = async (context: ThreadContext): Promise<string> => {
  let instructions = `
    <instructions>
      Before replying always think step-by-step on how to proceed.
      Print your thoughts inside <cot> tags.

      <example>
        <cot>To answer the question I need to ...</cot>
      </example>
    </instructions>

    <current_time>${new Date().toLocaleString()}</current_time>
  `;

  if (context.subject) {
    instructions += `
      <user_attention>
        The user is currently interacting with an object in Composer application:

        ${await formatContextObject(context.subject)}
      </user_attention>
    `;
  }

  return instructions;
};

const formatContextObject = async (object: ReactiveEchoObject<any>): Promise<string> => {
  const data = await preprocessContextObject(object);

  return `
    <object>
      <type>${getTypename(object)}</type>
      <id>${object.id}</id>
      ${formatObjectAsXMLTags(data)}
    </object>
  `;
};

const preprocessContextObject = async (object: ReactiveEchoObject<any>): Promise<any> => {
  // TODO(dmaretskyi): Serialize based on schema annotations.
  switch (getTypename(object)) {
    // TODO(dmaretskyi): Reference types somehow without plugin-automation depending on other plugins.
    case 'dxos.org/type/Document': {
      const data = (await getSpace(object)
        ?.db.query({ id: object.id }, { format: ResultFormat.Plain, include: { content: true } })
        .first()) ?? { content: { content: '' } };

      return {
        ...data,
        threads: undefined,
      };
    }

    default:
      return { ...object };
  }
};

const formatObjectAsXMLTags = (object: any, depth = 1): string => {
  return Object.entries(object)
    .filter(([key, value]) => ['string', 'number', 'boolean', 'object'].includes(typeof value))
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (depth === 0) {
          return '';
        } else {
          return `<${key}>
            ${formatObjectAsXMLTags(value, depth - 1)}
          </${key}>`;
        }
      }

      return `<${key}>${value}</${key}>`;
    })
    .join('\n');
};
