//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import databaseSource from '../../core/database.ts?raw';
import syncSource from '../../core/sync.ts?raw';
// The demo's own source, bundled as text. This is the point of the demo: the code on screen is the
// code running the page, not a transcription that can drift from it.
import schemaSource from '../../schema.ts?raw';
import workerSource from '../../worker/space-object.ts?raw';
import appSource from './App.tsx?raw';
import formSource from './DetailForm.tsx?raw';
import graphSource from './GraphView.tsx?raw';
import listSource from './ListView.tsx?raw';
import masterSource from './MasterView.tsx?raw';

type Aspect = { value: string; label: string; source: string };

const ASPECTS: Aspect[] = [
  { value: 'schema', label: 'Schema', source: schemaSource },
  { value: 'database', label: 'Open the database', source: databaseSource },
  { value: 'app', label: 'Master/detail', source: appSource },
  { value: 'master', label: 'Views + toolbar', source: masterSource },
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
    <Panel.Root>
      <Panel.Header asChild>
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
      </Panel.Header>

      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport>
            <SyntaxHighlighter language='ts' showLineNumbers>
              {aspect.source}
            </SyntaxHighlighter>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
