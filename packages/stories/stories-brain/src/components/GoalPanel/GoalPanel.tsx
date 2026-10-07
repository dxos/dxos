//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as CompilePrompt from '@dxos/brain/CompilePrompt';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Select from '@dxos/react-ui/Select';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';

/** The value of the example picker when the goal is the user's own. */
export const CUSTOM_EXAMPLE = 'custom';

export type GoalPanelProps = Util.ThemedClassName<{
  examples: Select.Option[];
  example: string;
  goal: string;
  instructions: string;
  /** Compile with a local Ollama model instead of the edge (Sonnet-class) one. */
  ollama: boolean;
  busy?: boolean;
  error?: string;
  /** Metadata of the last compilation. */
  reply?: CompilePrompt.Reply;
  onExampleChange: (example: string) => void;
  onGoalChange: (goal: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onOllamaChange: (ollama: boolean) => void;
  onCompile: () => void;
}>;

/** Goal column: the goal text and instructions, an example picker, and the Compile trigger. */
export const GoalPanel = ({
  classNames,
  examples,
  example,
  goal,
  instructions,
  ollama,
  busy,
  error,
  reply,
  onExampleChange,
  onGoalChange,
  onInstructionsChange,
  onOllamaChange,
  onCompile,
}: GoalPanelProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Header>
      <Toolbar.Root>
        <Select.Root
          items={examples}
          value={[example]}
          onValueChange={({ value }) => value[0] && onExampleChange(value[0])}
        >
          <Select.Trigger placeholder='Example' aria-label='Example goal' data-testid='goal-compiler.example' />
          <Select.Content>
            {examples.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
        <Input.Switch
          label='Ollama'
          checked={ollama}
          disabled={busy}
          onCheckedChange={({ checked }) => onOllamaChange(checked)}
        />
        <Button.Root
          icon={busy ? 'ph--spinner-gap--regular' : 'ph--sparkle--regular'}
          label='Compile'
          disabled={busy || goal.trim().length === 0}
          onClick={onCompile}
          data-testid='goal-compiler.compile'
        />
      </Toolbar.Root>
    </Panel.Header>
    <Panel.Body asChild>
      <ScrollArea.Root>
        <ScrollArea.Viewport asChild>
          <Layout.Container gap='md' padBlock>
            <Field.Root>
              <Field.Label>Goal</Field.Label>
              <Input.Root
                value={goal}
                placeholder='Get Dima to help me with the agent plugin'
                onChange={(event) => onGoalChange(event.target.value)}
                data-testid='goal-compiler.goal'
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Instructions</Field.Label>
              <Input.Textarea
                value={instructions}
                placeholder='Optional guidance, e.g. follow up after 2 days.'
                autoResize
                onChange={(event) => onInstructionsChange(event.target.value)}
              />
            </Field.Root>
            {error && (
              <Banner.Root valence='error'>
                <Banner.Title>Compile failed</Banner.Title>
                <Banner.Body>{error}</Banner.Body>
              </Banner.Root>
            )}
            {reply && (
              <Layout.Flex column gap='sm'>
                <Layout.Flex gap='sm' wrap>
                  {reply.kind && <Tag.Tag hue='sky'>{reply.kind}</Tag.Tag>}
                  {reply.drivers.map((driver) => (
                    <Tag.Tag key={driver}>{driver}</Tag.Tag>
                  ))}
                  {reply.achievement && <Tag.Tag hue='amber'>achieved by {reply.achievement}</Tag.Tag>}
                </Layout.Flex>
                {reply.notes && <Typography.Text tone='muted'>{reply.notes}</Typography.Text>}
              </Layout.Flex>
            )}
          </Layout.Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);
