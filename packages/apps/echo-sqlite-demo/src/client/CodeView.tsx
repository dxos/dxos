//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

// The demo's own source, bundled as text. This is the point of the demo: the code on screen is the
// code running the page, not a transcription that can drift from it.
import schemaSource from '../schema.ts?raw';
import workerSource from '../worker/space-object.ts?raw';
import formSource from './CreateForm.tsx?raw';
import databaseSource from './database.ts?raw';
import graphSource from './GraphView.tsx?raw';
import listSource from './ListView.tsx?raw';
import syncSource from './sync.ts?raw';

type Aspect = { value: string; label: string; source: string };

const ASPECTS: Aspect[] = [
  { value: 'schema', label: 'Schema', source: schemaSource },
  { value: 'database', label: 'Open the database', source: databaseSource },
  { value: 'list', label: 'Query + list', source: listSource },
  { value: 'form', label: 'Form', source: formSource },
  { value: 'graph', label: 'Graph', source: graphSource },
  { value: 'sync', label: 'Sync', source: syncSource },
  { value: 'worker', label: 'Durable Object', source: workerSource },
];

/** The source behind each aspect of the demo, imported with `?raw` so it cannot drift. */
export const CodeView = () => {
  const [value, setValue] = useState(ASPECTS[0].value);
  const aspect = ASPECTS.find((aspect) => aspect.value === value) ?? ASPECTS[0];

  return (
    <>
      <Toolbar.Root>
        <Toolbar.Text>Source</Toolbar.Text>
        <Select.Root items={ASPECTS} value={[value]} onValueChange={({ value }) => setValue(value[0])}>
          <Select.Trigger placeholder='Aspect' aria-label='Aspect' />
          <Select.Content>
            {ASPECTS.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
      </Toolbar.Root>

      <SyntaxHighlighter language='tsx' showLineNumbers>
        {aspect.source}
      </SyntaxHighlighter>
    </>
  );
};
