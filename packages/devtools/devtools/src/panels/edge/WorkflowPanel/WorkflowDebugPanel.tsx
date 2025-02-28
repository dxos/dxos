//
// Copyright 2024 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { Effect, Layer, type Scope } from 'effect';
// import { Ollama } from 'ollama';
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ComputeRequirements,
  type ComputeGraph,
  type WorkflowLoader,
  EventLogger,
  GptService,
  OllamaGpt,
  SpaceService,
  createDxosEventLogger,
  makeValueBag,
  unwrapValueBag,
  QueueService,
  FunctionCallService,
} from '@dxos/conductor';
import { AST } from '@dxos/echo-schema';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log, LogLevel } from '@dxos/log';
import { useConfig } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Avatar, Icon, Input, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

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

  const controller = useRef<AbortController>();
  useEffect(() => handleStop(), []);

  const handleStop = () => {
    controller.current?.abort('stop');
    controller.current = undefined;
  };

  const handleClear = () => {
    handleStop();
    setInput('');
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleResponse = ({ text, data, error }: { text?: string; data?: any; error?: Error } = {}) => {
    controller.current = undefined;
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
            .run(makeValueBag(requestBody))
            .pipe(
              Effect.withSpan('runWorkflow'),
              Effect.flatMap(unwrapValueBag),
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

      <Toolbar.Root classNames='p-1'>
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
        <Toolbar.Button onClick={() => handleRequest(input)}>
          <Icon icon='ph--play--regular' size={4} />
        </Toolbar.Button>
        <Toolbar.Button onClick={() => (isExecuting ? handleStop() : handleClear())}>
          <Icon icon={isExecuting ? 'ph--stop--regular' : 'ph--trash--regular'} size={4} />
        </Toolbar.Button>
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
  const wrapper = 'p-1 px-2 rounded-lg bg-hoverSurface overflow-auto';
  return (
    <div className={mx('flex', type === 'request' ? 'ml-[1rem] justify-end' : 'mr-[1rem]', classNames)}>
      {error && <div className={mx(wrapper, 'whitespace-pre text-error')}>{String(error)}</div>}

      {text !== undefined && (
        <div className={mx(wrapper, type === 'request' && 'bg-primary-400 dark:bg-primary-600')}>
          {text || '\u00D8'}
        </div>
      )}

      {data && (
        <SyntaxHighlighter language='json' className={mx(wrapper, 'px-8 py-2 text-xs')}>
          {JSON.stringify(data, null, 2)}
        </SyntaxHighlighter>
      )}
    </div>
  );
};

const RobotAvatar = () => (
  <Avatar.Root size={6} variant='circle'>
    <Avatar.Frame>
      <Avatar.Icon icon='ph--robot--regular' />
    </Avatar.Frame>
  </Avatar.Root>
);

const createLocalExecutionContext = (space: Space): Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>> => {
  const logLayer = Layer.succeed(EventLogger, createDxosEventLogger(LogLevel.INFO));
  // TODO(wittjosiah): Breaks bundle.
  const gptLayer = Layer.succeed(GptService, new OllamaGpt(null as any /* new Ollama() */));
  const spaceService = Layer.succeed(SpaceService, {
    spaceId: space.id,
    db: space.db,
  });
  const queueService = QueueService.notAvailable;
  const functionCallService = Layer.succeed(FunctionCallService, FunctionCallService.mock());
  return Layer.mergeAll(logLayer, gptLayer, spaceService, queueService, FetchHttpClient.layer, functionCallService);
};

const inputTemplateFromAst = (ast: AST.AST): string => {
  return `{ ${AST.getPropertySignatures(ast)
    .map((property) => `"${property.name.toString()}": ""`)
    .join(', ')} }`;
};

/**
 * Request or response.
 */
type Message = { type: 'request' | 'response'; text?: string; data?: any; error?: Error };
