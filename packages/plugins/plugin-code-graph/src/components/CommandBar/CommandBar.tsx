//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';

/** One timed step of a command: grounding, a model call, an add or remove, or the judge. */
export type CommandStep = {
  kind: 'ground' | 'model' | 'add' | 'remove' | 'judge';
  /** The model turn the step belongs to; 0 before the first. */
  turn: number;
  ms: number;
  label: string;
  /** The SPARQL, filter or model message. */
  detail?: string;
  error?: string;
};

export type CommandOutcome = {
  command: string;
  message?: string;
  /** What did not fit on the graph. */
  trailer?: string;
  error?: string;
  /** Milliseconds from submit to answer. */
  elapsedMs?: number;
  /** The steps the command took, shown in verbose mode. */
  trace?: readonly CommandStep[];
};

export type CommandBarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  outcome?: CommandOutcome;
  onSubmit: (command: string) => void;
  /** Text to put in the field, e.g. a spoken command as it is transcribed. */
  draft?: string;
  /** A control beside the field, such as a microphone toggle. */
  speech?: ReactNode;
  /** Show every step of the outcome with its timing. */
  verbose?: boolean;
  onVerboseChange?: (verbose: boolean) => void;
};

/**
 * A floating button that opens a one-line command field over the canvas. The host positions its frame; the bar
 * anchors to the frame's bottom edge.
 */
export const CommandBar = ({
  open,
  onOpenChange,
  pending,
  outcome,
  onSubmit,
  draft,
  speech,
  verbose,
  onVerboseChange,
}: CommandBarProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // A spoken command fills the field as it is heard and clears it once it runs; typed text survives a microphone toggle.
  const previousDraft = useRef(draft);
  useEffect(() => {
    if (draft !== undefined) {
      setValue(draft);
    } else if (previousDraft.current !== undefined) {
      setValue('');
    }
    previousDraft.current = draft;
  }, [draft]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const submit = useCallback(() => {
    const command = value.trim();
    if (command.length > 0 && !pending) {
      onSubmit(command);
      setValue('');
    }
  }, [value, pending, onSubmit]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
      }
    },
    [submit, onOpenChange],
  );

  if (!open) {
    return (
      <Button.Root
        classNames='absolute bottom-3 right-3 rounded-full shadow-md'
        variant='primary'
        icon='ph--terminal-window--regular'
        iconOnly
        label={t('command-open.label')}
        onClick={() => onOpenChange(true)}
        data-testid='code-graph-command-open'
      />
    );
  }

  return (
    <Card.Root
      classNames='absolute bottom-3 inset-x-3 mx-auto max-w-xl shadow-md'
      data-testid='code-graph-command'
      aria-busy={pending}
    >
      <Layout.Flex align='center' gap='xs' classNames='p-1'>
        <Icon.Icon
          icon={pending ? 'ph--spinner--regular' : 'ph--terminal-window--regular'}
          classNames={['shrink-0 mx-1', pending && 'animate-spin']}
        />
        <Input.Root
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('command.placeholder')}
          aria-label={t('command.label')}
          classNames='grow min-w-0'
          data-testid='code-graph-command-input'
        />
        {speech}
        {onVerboseChange && (
          <Button.Root
            icon='ph--list-magnifying-glass--regular'
            iconOnly
            variant={verbose ? 'primary' : 'ghost'}
            label={t(verbose ? 'command-verbose-off.label' : 'command-verbose-on.label')}
            aria-pressed={verbose}
            onClick={() => onVerboseChange(!verbose)}
            data-testid='code-graph-command-verbose'
          />
        )}
        <Button.Root
          icon='ph--arrow-right--regular'
          iconOnly
          label={t('command-run.label')}
          disabled={pending || value.trim().length === 0}
          onClick={submit}
          data-testid='code-graph-command-run'
        />
        <Button.Root
          icon='ph--x--regular'
          iconOnly
          variant='ghost'
          label={t('command-close.label')}
          onClick={() => onOpenChange(false)}
        />
      </Layout.Flex>
      {outcome && (
        <Layout.Flex column gap='xs' classNames='px-3 pb-2 text-sm' data-testid='code-graph-command-outcome'>
          <Layout.Flex gap='sm' classNames='text-description'>
            <span className='truncate'>{outcome.command}</span>
            {outcome.elapsedMs !== undefined && (
              <span className='ml-auto shrink-0 tabular-nums'>{(outcome.elapsedMs / 1000).toFixed(1)}s</span>
            )}
          </Layout.Flex>
          {outcome.error ? (
            <p className='text-error-text'>{outcome.error}</p>
          ) : (
            outcome.message && <p>{outcome.message}</p>
          )}
          {outcome.trailer && (
            <p className='text-description' data-testid='code-graph-command-trailer'>
              {outcome.trailer}
            </p>
          )}
          {verbose && outcome.trace && outcome.trace.length > 0 && <Trace steps={outcome.trace} />}
        </Layout.Flex>
      )}
    </Card.Root>
  );
};

const formatMs = (ms: number) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);

/** The steps of a command, one row each, with the query or filter beneath. */
const Trace = ({ steps }: { steps: readonly CommandStep[] }) => {
  const total = steps.reduce((sum, { ms }) => sum + ms, 0);
  return (
    <ol
      className='max-h-64 overflow-y-auto border-t border-separator pt-1 text-xs'
      data-testid='code-graph-command-trace'
    >
      {steps.map((step, index) => (
        <li key={index} className='py-0.5' data-testid='code-graph-command-step'>
          <Layout.Flex gap='sm'>
            <span className='w-6 shrink-0 text-description tabular-nums'>{step.turn > 0 ? `T${step.turn}` : ''}</span>
            <span className='w-14 shrink-0 font-medium'>{step.kind}</span>
            <span className={step.error ? 'grow text-error-text' : 'grow'}>{step.label}</span>
            <span className='shrink-0 tabular-nums text-description'>{formatMs(step.ms)}</span>
          </Layout.Flex>
          {step.detail && (
            <pre className='ml-20 whitespace-pre-wrap break-all font-mono text-description'>{step.detail}</pre>
          )}
          {step.error && <p className='ml-20 break-all text-error-text'>{step.error}</p>}
        </li>
      ))}
      <li className='pt-1 text-right tabular-nums text-description'>{formatMs(total)} in steps</li>
    </ol>
  );
};
