import { asyncTimeout } from '@dxos/async';
import type { ReactiveEchoObject } from '@dxos/echo-db';
import { getTypename } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { Filter, getSpace, ResultFormat } from '@dxos/react-client/echo';

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
  let data;
  try {
    data = await asyncTimeout(preprocessContextObject(object), CONTEXT_OBJECT_QUERY_TIMEOUT);
  } catch (err: any) {
    log.error('Failed to preprocess context object:', { err });
    data = object;
  }

  if (typeof data === 'string') {
    return data;
  } else {
    return `
      <object>
        <type>${getTypename(object)}</type>
        <id>${object.id}</id>
        ${formatObjectAsXMLTags(data)}
      </object>
    `;
  }
};

const preprocessContextObject = async (object: ReactiveEchoObject<any>): Promise<Record<string, any> | string> => {
  const space = getSpace(object);
  if (!space) {
    return { ...object };
  }

  // TODO(dmaretskyi): Serialize based on schema annotations.
  switch (getTypename(object)) {
    // TODO(dmaretskyi): Reference types somehow without plugin-automation depending on other plugins.
    case 'dxos.org/type/Document': {
      const data = space.db
        .query({ id: object.id }, { format: ResultFormat.Plain, include: { content: true } })
        .first() ?? { content: { content: '' } };

      return {
        ...data,
        threads: undefined,
      };
    }

    case 'dxos.org/type/Table': {
      // TODO(dmaretskyi): Load references.
      const schema = object.view ? space?.db.schemaRegistry.getSchema(object.view.query.typename) : undefined;
      const { objects: rows } =
        (schema &&
          (await space.db
            .query(Filter.schema(schema), { format: ResultFormat.Plain, limit: TABLE_ROWS_LIMIT })
            .run())) ??
        {};

      // TODO(dmaretskyi): Format table schema.
      return `
        <object>
          <id>${object.id}</id>
          <type>${getTypename(object)}</type>
          ${formatObjectAsXMLTags(object)}

          <rows>
            <!-- Limited to first ${TABLE_ROWS_LIMIT} rows. -->
            ${rows
              ?.map(
                (row: any) => `<row>
                  ${formatObjectAsXMLTags(row)}
                </row>`,
              )
              .join('\n')}
          </rows>

      `;
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

const CONTEXT_OBJECT_QUERY_TIMEOUT = 5_000;

const TABLE_ROWS_LIMIT = 10;
