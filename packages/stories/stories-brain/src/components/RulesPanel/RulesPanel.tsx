//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import type * as Compiler from '@dxos/brain/Compiler';
import { Editor } from '@dxos/react-ui-editor';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Listbox from '@dxos/react-ui/Listbox';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { createBasicExtensions, createThemeExtensions, datalog } from '@dxos/ui-editor';

export type RulesPanelProps = Util.ThemedClassName<{
  source: string;
  /** Diagnostics of `source`, from `Compiler.compile`. */
  diagnostics: ReadonlyArray<Compiler.Diagnostic>;
  onSourceChange: (source: string) => void;
  /** Loads the hand-written reference compilation of the selected example; omitted when there is none. */
  onLoadReference?: () => void;
}>;

/** Rules column: editable Datalog over the goal relations, with the compiler's diagnostics below. */
export const RulesPanel = ({ classNames, source, diagnostics, onSourceChange, onLoadReference }: RulesPanelProps) => {
  const themeMode = Hooks.useThemeMode();
  const extensions = useMemo(
    () => [
      createBasicExtensions({
        lineNumbers: true,
        lineWrapping: true,
        placeholder: 'Datalog rules — compile the goal or load the reference',
      }),
      createThemeExtensions({ themeMode, monospace: true, syntaxHighlighting: true }),
      datalog(),
    ],
    [themeMode],
  );
  const items = useMemo(
    () =>
      diagnostics.map((diagnostic, index) => ({
        value: String(index),
        label: diagnostic.message,
        description: `${diagnostic.position ? `${diagnostic.position.line}:${diagnostic.position.column} ` : ''}${diagnostic.code}`,
      })),
    [diagnostics],
  );

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Rules</Toolbar.Text>
          <Button.Root
            icon='ph--book-open--regular'
            label='Load reference'
            disabled={!onLoadReference}
            onClick={onLoadReference}
            data-testid='goal-compiler.load-reference'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Editor.Root>
          <Editor.View value={source} onChange={onSourceChange} extensions={extensions} />
        </Editor.Root>
      </Panel.Body>
      <Panel.Footer data-testid='goal-compiler.diagnostics' data-count={diagnostics.length}>
        {source.trim().length === 0 ? (
          <Banner.Root>
            <Banner.Title>No rules</Banner.Title>
          </Banner.Root>
        ) : diagnostics.length === 0 ? (
          <Banner.Root valence='success'>
            <Banner.Title>Rules compile</Banner.Title>
          </Banner.Root>
        ) : (
          <Listbox.Root items={items} selectionMode='none' classNames='max-h-48'>
            <Listbox.Content>
              {items.map((item) => (
                <Listbox.Item key={item.value} item={item}>
                  <Listbox.ItemIcon icon='ph--warning-circle--regular' valence='error' />
                  <Listbox.ItemText />
                  <Listbox.ItemDescription />
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        )}
      </Panel.Footer>
    </Panel.Root>
  );
};
