//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { JsonSchema, Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { Provider } from '../../types';

export type ProviderArticleProps = AppSurface.ObjectArticleProps<Provider.Provider>;

const decodeJsonSchema = Schema.decodeUnknownSync(JsonSchema.JsonSchema, { errors: 'first' });
const decodeRequestMapping = Schema.decodeUnknownSync(Provider.RequestMapping, { errors: 'first' });
const decodeResultMapping = Schema.decodeUnknownSync(Provider.ResultMapping, { errors: 'first' });

/**
 * Article view for editing a {@link Provider} template.
 * Renders a form for scalar fields and JSON textareas for the mapping fields.
 */
export const ProviderArticle = ({ role, subject }: ProviderArticleProps) => {
  const [provider] = useObject(subject);

  // Derive the form schema once: strip `id` and the three hidden mapping fields.
  const formSchema = useMemo(() => omitId(Type.getSchema(Provider.Provider)), []);

  const handleSave = useCallback(
    (values: Record<string, unknown>) => {
      Obj.update(subject, (subject) => {
        if (typeof values.name === 'string') {
          subject.name = values.name;
        }
        if (typeof values.url === 'string') {
          subject.url = values.url;
        }
        if (values.kind === 'api' || values.kind === 'scrape') {
          subject.kind = values.kind;
        }
        subject.description = typeof values.description === 'string' ? values.description : undefined;
        if (typeof values.enabled === 'boolean') {
          subject.enabled = values.enabled;
        }
      });
    },
    [subject],
  );

  const handleSearchSchemaChange = useCallback(
    (raw: string) => {
      try {
        const decoded = decodeJsonSchema(JSON.parse(raw));
        Obj.update(subject, (subject) => {
          // `JsonSchema.JsonSchema` is deeply-readonly; the ECHO mutable proxy
          // requires the mutable variant. This boundary coercion is safe — the
          // value is stored verbatim, matching the pattern in set-provider-template.ts.
          subject.searchSchema = decoded as Types.DeepMutable<JsonSchema.JsonSchema>;
        });
      } catch {
        // Invalid JSON or schema — leave unchanged.
      }
    },
    [subject],
  );

  const handleRequestChange = useCallback(
    (raw: string) => {
      try {
        const decoded = decodeRequestMapping(JSON.parse(raw));
        Obj.update(subject, (subject) => {
          subject.request = decoded;
        });
      } catch {
        // Invalid JSON or mapping — leave unchanged.
      }
    },
    [subject],
  );

  const handleResultChange = useCallback(
    (raw: string) => {
      try {
        const decoded = decodeResultMapping(JSON.parse(raw));
        Obj.update(subject, (subject) => {
          subject.result = decoded;
        });
      } catch {
        // Invalid JSON or mapping — leave unchanged.
      }
    },
    [subject],
  );

  if (!provider) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <div className='flex flex-col gap-4 p-4 overflow-y-auto h-full'>
          <Form.Root
            schema={formSchema}
            values={{
              name: provider.name,
              url: provider.url,
              kind: provider.kind,
              description: provider.description,
              enabled: provider.enabled,
            }}
            autoSave
            onSave={handleSave}
          >
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Form.Root>

          <div className='flex flex-col gap-1'>
            <span className='text-sm font-medium text-description'>Search Schema (JSON)</span>
            <textarea
              className='font-mono text-xs border border-separator rounded p-2 resize-y min-h-[8rem] bg-input text-primary'
              defaultValue={JSON.stringify(provider.searchSchema ?? {}, null, 2)}
              key={JSON.stringify(provider.searchSchema)}
              onBlur={(event) => handleSearchSchemaChange(event.target.value)}
            />
          </div>

          <div className='flex flex-col gap-1'>
            <span className='text-sm font-medium text-description'>Request Mapping (JSON)</span>
            <textarea
              className='font-mono text-xs border border-separator rounded p-2 resize-y min-h-[8rem] bg-input text-primary'
              defaultValue={JSON.stringify(provider.request ?? {}, null, 2)}
              key={JSON.stringify(provider.request)}
              onBlur={(event) => handleRequestChange(event.target.value)}
            />
          </div>

          <div className='flex flex-col gap-1'>
            <span className='text-sm font-medium text-description'>Result Mapping (JSON)</span>
            <textarea
              className='font-mono text-xs border border-separator rounded p-2 resize-y min-h-[8rem] bg-input text-primary'
              defaultValue={JSON.stringify(provider.result ?? {}, null, 2)}
              key={JSON.stringify(provider.result)}
              onBlur={(event) => handleResultChange(event.target.value)}
            />
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
