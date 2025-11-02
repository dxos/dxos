//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
// import { Ollama } from 'ollama';
import * as SchemaAST from 'effect/SchemaAST';
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { type ComputeGraph, ValueBag, type WorkflowLoader } from '@dxos/conductor';
import { EdgeHttpClient } from '@dxos/edge-client';
import { RemoteFunctionExecutionService, createEventLogger } from '@dxos/functions';
import { DatabaseService, QueueService, ServiceContainer, type Services } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { LogLevel, log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Avatar, Input, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { errorText, mx } from '@dxos/react-ui-theme';

import { useDevtoolsState } from '../../../hooks';

// TODO: reconcile with DebugPanel in ScriptPlugin

export enum WorkflowDebugPanelMode {
  LOCAL = 'local',
  REMOTE = 'remote',
}

export type WorkflowDebugPanelProps = ThemedClassName<{
  mode: WorkflowDebugPanelMode;
  loader: WorkflowLoader;
  graph: ComputeGraph;
}>;

export const WorkflowDebugPanel = (props: WorkflowDebugPanelProps) => {
  const config = useConfig();
  const inputRef = useRef<HTMLInputElement>(null);
  const { space } = useDevtoolsState();
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [inputTemplate, setInputTemplate] = useState('');

  const edgeClient = useMemo(() => {
    const edgeUrl = config.values.runtime?.services?.edge?.url;
    invariant(edgeUrl, 'Edge url not configured');
    return new EdgeHttpClient(edgeUrl);
  }, [config]);

  useEffect(() => {
    setInputTemplate('');
    props.loader
      .load(DXN.fromLocalObjectId(props.graph.id))
      .then((workflow) => {
        const workflowMeta = workflow.resolveMeta();
        if (workflowMeta.inputs.length) {
          const inputTemplate = inputTemplateFromAst(workflowMeta.inputs[0].schema.ast);
          setInputTemplate(inputTemplate);
          if (!input.length) {
            setInput(inputTemplate);
          }
        }
      })
      .catch(log.catch);
  }, [props.loader, props.graph.id]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  const controller = useRef<AbortController>(null);
  useEffect(() => handleStop(), []);

  const handleStop = () => {
    controller.current?.abort('stop');
    controller.current = null;
  };

  const handleClear = () => {
    handleStop();
    setInput('');
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleResponse = ({
    text,
    data,
    error,
  }: {
    text?: string;
    data?: any;
    error?: Error;
  } = {}) => {
    controller.current = null;
    setHistory((history) => [...history, { type: 'response', text, data, error } satisfies Message]);
    setIsExecuting(false);
    handleScroll();
  };

  const handleRequest = async (input: string) => {
    invariant(space);
    try {
      invariant(input.charAt(0) === '{', 'Not a JSON object.');
      const validJsonString = input.replace(/'/g, '"').replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
      const requestBody = JSON.parse(validJsonString);

      setIsExecuting(true);

      setInput(inputTemplate);
      setHistory((history) => [...history, { type: 'request', text: JSON.stringify(requestBody, null, 2) }]);
      setTimeout(() => handleScroll());

      // Throws DOMException when aborted.
      controller.current = new AbortController();

      let response: any;
      if (props.mode === WorkflowDebugPanelMode.REMOTE) {
        response = await edgeClient.executeWorkflow(space.id, props.graph.id, requestBody);
      } else {
        const compiled = await props.loader.load(DXN.fromLocalObjectId(props.graph.id));
        response = await Effect.runPromise(
          compiled
            .run(ValueBag.make(requestBody))
            .pipe(
              Effect.withSpan('runWorkflow'),
              Effect.flatMap(ValueBag.unwrap),
              Effect.provide(createLocalExecutionContext(space)),
              Effect.scoped,
            ),
        );
      }
      handleResponse({ data: response });
    } catch (err: any) {
      if (err !== 'stop') {
        const error = err instanceof Error ? err : new Error(err);
        handleResponse({ error });
        log.catch(err);
      } else {
        handleResponse();
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className={mx('flex flex-col w-full h-full overflow-hidden', props.classNames)}>
      <MessageThread ref={scrollerRef} history={history} />

      <Toolbar.Root>
        <Input.Root>
          <Input.TextInput
            ref={inputRef}
            autoFocus
            placeholder={'Input JSON'}
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && handleRequest(input)}
          />
        </Input.Root>
        <Toolbar.IconButton
          icon='ph--play--regular'
          size={4}
          label='Execute'
          iconOnly
          onClick={() => handleRequest(input)}
        />
        <Toolbar.IconButton
          icon={isExecuting ? 'ph--stop--regular' : 'ph--trash--regular'}
          size={4}
          label={isExecuting ? 'Stop' : 'Clear'}
          iconOnly
          onClick={() => (isExecuting ? handleStop() : handleClear())}
        />
      </Toolbar.Root>
    </div>
  );
};

type MessageThreadProps = {
  history: Message[];
};

const MessageThread = forwardRef<HTMLDivElement, MessageThreadProps>(
  ({ history }: MessageThreadProps, forwardedRef) => {
    if (!history.length) {
      return null;
    }

    return (
      <div ref={forwardedRef} className='flex flex-col gap-6 h-full p-2 overflow-x-hidden overflow-y-auto'>
        {history.map((message, i) => (
          <div key={i} className='grid grid-cols-[2rem_1fr_2rem]'>
            <div className='p-1'>{message.type === 'response' && <RobotAvatar />}</div>
            <div className='overflow-auto'>
              <MessageItem message={message} />
            </div>
          </div>
        ))}
      </div>
    );
  },
);

const MessageItem = ({ classNames, message }: ThemedClassName<{ message: Message }>) => {
  const { type, text, data, error } = message;
  const wrapper = 'p-1 px-2 rounded-md bg-hoverSurface overflow-auto';
  return (
    <div className={mx('flex', type === 'request' ? 'ml-[1rem] justify-end' : 'mr-[1rem]', classNames)}>
      {error && <div className={mx(wrapper, 'whitespace-pre', errorText)}>{String(error)}</div>}

      {text !== undefined && (
        <div className={mx(wrapper, type === 'request' && 'bg-primary-400 dark:bg-primary-600')}>
          {text || '\u00D8'}
        </div>
      )}

      {data && (
        <SyntaxHighlighter language='json' className={mx(wrapper, 'text-xs')}>
          {JSON.stringify(data, null, 2)}
        </SyntaxHighlighter>
      )}
    </div>
  );
};

const RobotAvatar = () => (
  <Avatar.Root>
    <Avatar.Content size={6} variant='circle' icon='ph--robot--regular' />
  </Avatar.Root>
);

const createLocalExecutionContext = (space: Space): Layer.Layer<Services> => {
  return new ServiceContainer()
    .setServices({
      eventLogger: createEventLogger(LogLevel.INFO),
      database: DatabaseService.make(space.db),
      queues: QueueService.make(space.queues, undefined),
      functionCallService: RemoteFunctionExecutionService.mock(),
    })
    .createLayer();
};

const inputTemplateFromAst = (ast: SchemaAST.AST): string => {
  return `{ ${SchemaAST.getPropertySignatures(ast)
    .map((property) => `"${property.name.toString()}": ""`)
    .join(', ')} }`;
};

/**
 * Request or response.
 */
type Message = {
  type: 'request' | 'response';
  text?: string;
  data?: any;
  error?: Error;
};
