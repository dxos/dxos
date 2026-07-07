//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type Type } from '@dxos/pipeline-rdf';
import { Button, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';

import { type EchoObjectItem, EchoObjectsList } from '../EchoObjectsList';
import { FactPanel } from '../FactPanel';

type OutputTab = 'facts' | 'objects';

export type OutputPanelProps = ThemedClassName<{
  facts: Type.Fact[];
  objects: EchoObjectItem[];
}>;

/**
 * Output column: a toolbar of button tabs selecting the view — the {@link FactPanel} (facts +
 * entities + predicates) or the {@link EchoObjectsList} of materialized ECHO objects.
 */
export const OutputPanel = ({ classNames, facts, objects }: OutputPanelProps) => {
  const [tab, setTab] = useState<OutputTab>('facts');
  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Button variant={tab === 'facts' ? 'primary' : 'ghost'} onClick={() => setTab('facts')}>
            Facts
          </Button>
          <Button variant={tab === 'objects' ? 'primary' : 'ghost'} onClick={() => setTab('objects')}>
            Objects
          </Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='min-h-0'>
        {tab === 'facts' ? (
          <FactPanel facts={facts} classNames='h-full' />
        ) : (
          <EchoObjectsList objects={objects} classNames='h-full' />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
