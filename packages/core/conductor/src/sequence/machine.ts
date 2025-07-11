//
// Copyright 2025 DXOS.org
//

import { Match, Schema } from 'effect';

import {
  createTool,
  type AiServiceClient,
  Message,
  type MessageContentBlock,
  ToolResult,
  type ToolUseContentBlock,
  type ToolRegistry,
} from '@dxos/ai';
import { AISession } from '@dxos/assistant';
import { Event } from '@dxos/async';
import { Key, Obj } from '@dxos/echo';
import { type ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';

import type { Sequence, SequenceStep } from './sequence';

const SYSTEM_PROMPT = `
You are a smart Rule-Following Agent.
Rule-Following Agent executes the command that the user sent in the last message.
After doing the work, the Rule-Following Agent calls report tool.
If the Rule-Following agent believes that no action is needed, it calls the report tool with "skipped" status.
If the Rule-Following Agent is unable to perform the task, it calls the report tool with "bail" status.
Rule-Following Agent explains the reason it is unable to perform the task before bailing.
The Rule-Following Agent can express creativity and imagination in the way it performs the task.
The Rule-Following Agent precisely follows the instructions.
`;

export type SequenceTraceStep = {
  status: 'done' | 'bailed' | 'skipped';
  stepId: ObjectId;
  comment: string;
};

export type SequenceMachineState = {
  history: Message[];
  trace: SequenceTraceStep[];
  state: 'working' | 'bail' | 'done';
};

const INITIAL_STATE: SequenceMachineState = {
  state: 'working',
  history: [],
  trace: [],
};

type ExecutionOptions = {
  aiClient: AiServiceClient;

  /**
   * Input to the sequence.
   */
  input?: unknown;
};

export type SequenceEvent =
  | { type: 'begin'; invocationId: string }
  | { type: 'end'; invocationId: string }
  | { type: 'step-start'; invocationId: string; step: SequenceStep }
  | { type: 'step-complete'; invocationId: string; step: SequenceStep }
  | { type: 'message'; invocationId: string; message: Message }
  | { type: 'block'; invocationId: string; block: MessageContentBlock };

export interface SequenceLogger {
  log(event: SequenceEvent): void;
}

/**
 * Sequence state machine.
 * @deprecated Use sequence compiler and run a circuit instead.
 */
export class SequenceMachine {
  public readonly begin = new Event<void>();
  public readonly end = new Event<void>();
  public readonly stepStart = new Event<SequenceStep>();
  public readonly stepComplete = new Event<SequenceStep>();
  public readonly message = new Event<Message>();
  public readonly block = new Event<MessageContentBlock>();

  // TODO(burdon): Replace events with logger?
  private logger?: SequenceLogger;

  private _state: SequenceMachineState = structuredClone(INITIAL_STATE);

  constructor(
    readonly registry: ToolRegistry,
    readonly sequence: Sequence,
  ) {}

  get state(): SequenceMachineState {
    return this._state;
  }

  setLogger(logger: SequenceLogger): this {
    this.logger = logger;
    return this;
  }

  async runToCompletion(options: ExecutionOptions): Promise<void> {
    const invocationId = Key.ObjectId.random();
    log.info('runToCompletion', { invocationId, options });

    this.begin.emit();
    this.logger?.log({ type: 'begin', invocationId });

    let firstStep = true;
    while (this._state.state !== 'done') {
      const input = firstStep ? options.input : undefined;
      firstStep = false;

      this._state = await this._execStep(invocationId, this._state, { input, aiClient: options.aiClient });

      const step = this.sequence.steps.find((step) => step.id === this._state.trace.at(-1)?.stepId)!;
      this.stepComplete.emit(step);
      this.logger?.log({ type: 'step-complete', invocationId, step });

      if (this._state.state === 'bail') {
        throw new Error('Agent unable to follow the sequence');
      }
    }

    this.end.emit();
    this.logger?.log({ type: 'end', invocationId });
  }

  private async _execStep(
    invocationId: string,
    state: SequenceMachineState,
    options: ExecutionOptions,
  ): Promise<SequenceMachineState> {
    const prevStep = this.sequence.steps.findIndex((step) => step.id === this._state.trace.at(-1)?.stepId);
    if (prevStep === this.sequence.steps.length - 1) {
      throw new Error('Done execution sequence');
    }

    const nextStep = this.sequence.steps[prevStep + 1];
    const onLastStep = prevStep === this.sequence.steps.length - 2;

    this.stepStart.emit(nextStep);
    this.logger?.log({ type: 'step-start', invocationId, step: nextStep });

    const ReportSchema = Schema.Struct({
      status: Schema.Literal('done', 'bailed', 'skipped').annotations({
        description: 'The status of the task completion',
      }),
      comment: Schema.String.annotations({
        description:
          'A comment about the task completion. If you bailed, you must explain why in detail (min couple of sentences).',
      }),
    });

    const report = createTool('system', {
      name: 'report',
      description: 'This tool reports that the agent has completed the task or is unable to do so.',
      schema: ReportSchema,
      execute: async (input) => ToolResult.Break(input),
    });

    const session = new AISession({
      operationModel: 'configured',
    });

    session.userMessage.pipeInto(this.message);
    session.message.pipeInto(this.message);
    session.block.pipeInto(this.block);

    const inputMessages = options.input
      ? [
          Obj.make(Message, {
            role: 'user',
            content: [taggedDataBlock('input', options.input)],
          }),
        ]
      : [];
    inputMessages.forEach((message) => {
      this.message.emit(message);
      this.logger?.log({ type: 'message', invocationId, message });
    });

    const messages = await session.run({
      systemPrompt: SYSTEM_PROMPT,
      history: [...state.history, ...inputMessages],
      tools: [...(nextStep.tools ?? [])],
      artifacts: [],
      executableTools: [report],
      client: options.aiClient,
      prompt: nextStep.instructions,
      toolResolver: this.registry,
    });

    const { messages: trimmedHistory, call: lastBlock } = popLastToolCall(messages);
    if (!lastBlock) {
      // TODO(dmaretskyi): Handle this with grace.
      throw new Error('Agent did not call the report tool');
    }

    const { status, comment } = ReportSchema.pipe(Schema.decodeUnknownSync)(lastBlock.input);

    return {
      history: [...state.history, ...inputMessages, ...trimmedHistory],
      trace: [
        ...state.trace,
        {
          stepId: nextStep.id,
          status,
          comment,
        },
      ],
      state: Match.value(status).pipe(
        Match.withReturnType<SequenceMachineState['state']>(),
        Match.when('done', () => (onLastStep ? 'done' : 'working')),
        Match.when('skipped', () => (onLastStep ? 'done' : 'working')),
        Match.when('bailed', () => 'bail'),
        Match.exhaustive,
      ),
    };
  }
}

const taggedDataBlock = (tag: string, data: unknown): MessageContentBlock => {
  return {
    type: 'text',
    text: `<${tag}>\n${JSON.stringify(data, null, 2)}\n</${tag}>`,
  } satisfies MessageContentBlock;
};

const popLastToolCall = (messages: Message[]): { messages: Message[]; call?: ToolUseContentBlock } => {
  const lastBlock = messages.at(-1)?.content.at(-1);
  if (lastBlock?.type !== 'tool_use') {
    return { messages };
  }

  const trimmedHistory = [
    ...messages.slice(0, -1),
    {
      ...messages.at(-1)!,
      content: [...messages.at(-1)!.content.slice(0, -1)],
    } satisfies Message,
  ];

  return {
    messages: trimmedHistory,
    call: lastBlock,
  };
};
