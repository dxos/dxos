//
// Copyright 2026 DXOS.org
//

// Renders a react-ui-form for one MCP tool's input schema. The schema is an
// Effect `Schema.Struct(...)` from `@dxos/introspect-mcp/tools` — same one the
// server converts to zod for the MCP SDK at registration time. Authoring once
// in Effect and reusing here is the whole point of the converter.

import React from 'react';

import { Form } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import type { ToolEntry } from '../types';

export type ToolFormProps = {
  /** The tool whose input is being edited. Title + description display above the form. */
  tool: ToolEntry;
  /**
   * Initial values. Defaults to `{}` — most tool inputs are entirely optional
   * (`limit`, `compact`, `pluginId` filters), so an empty submission is valid.
   */
  defaultValues?: Record<string, unknown>;
  /**
   * Called when the user submits the form. The args object matches the tool's
   * Effect Schema `Type`; pass it straight to `client.callTool({ name, arguments })`.
   */
  onSubmit?: (args: Record<string, unknown>) => void;
  /** Optional cancel handler — wires to Form's keyboard cancel. */
  onCancel?: () => void;
  className?: string;
};

export const ToolForm = ({ tool, defaultValues, onSubmit, onCancel, className }: ToolFormProps) => {
  // Re-create the form when the tool changes so the Form internal state
  // resets. Without this, switching from list_packages to get_plugin would
  // try to re-validate the previous tool's values against the new schema.
  return (
    <div className={mx('flex flex-col gap-3 p-3 overflow-auto', className)}>
      <header>
        <h2 className='text-lg font-semibold'>{tool.title}</h2>
        {tool.description && (
          <p className='text-sm text-description whitespace-pre-line mt-1'>{tool.description.trim()}</p>
        )}
      </header>
      <Form.Root
        schema={tool.inputSchema as any}
        values={(defaultValues ?? {}) as any}
        onSave={(values) => onSubmit?.(values as Record<string, unknown>)}
        onCancel={onCancel}
      >
        <Form.Content>
          <Form.FieldSet />
          <Form.Actions>
            <Form.Submit>Run tool</Form.Submit>
          </Form.Actions>
        </Form.Content>
      </Form.Root>
    </div>
  );
};
