//
// Copyright 2025 DXOS.org
//

import { Match, Schema } from 'effect';

import {
  createTool,
  type ExecutableTool,
  Message,
  ToolResult,
  type AIServiceClient,
  type MessageContentBlock,
  type ToolUseContentBlock,
} from '@dxos/ai';
import { Event } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { type ObjectId } from '@dxos/keys';
import { log } from '@dxos/log';

import type { Blueprint, BlueprintStep } from './blueprint';
import { AISession } from '../session';

export type BlueprintTraceStep = {
  status: 'done' | 'bailed' | 'skipped';
  stepId: ObjectId;
  comment: string;
};

export type BlueprintMachineState = {
  history: Message[];
  trace: BlueprintTraceStep[];
  state: 'working' | 'bail' | 'done';
};

const INITIAL_STATE: BlueprintMachineState = {
  state: 'working',
  history: [],
  trace: [],
};

type ExecutionOptions = {
  aiService: AIServiceClient;

  /**
   * Input to the blueprint.
   */
  input?: unknown;
};

/**
 * Blueprint state machine.
 */
export class BlueprintMachine {
  public readonly begin = new Event<void>();
  public readonly end = new Event<void>();
  public readonly stepStart = new Event<BlueprintStep>();
  public readonly stepComplete = new Event<BlueprintStep>();
  public readonly message = new Event<Message>();
  public readonly block = new Event<MessageContentBlock>();

  state: BlueprintMachineState = structuredClone(INITIAL_STATE);

  constructor(readonly blueprint: Blueprint) {}

  async runToCompletion(options: ExecutionOptions): Promise<void> {
    log.info('runToCompletion', options);

    this.begin.emit();
    let firstStep = true;
    while (this.state.state !== 'done') {
      const input = firstStep ? options.input : undefined;

      firstStep = false;
      this.state = await this._execStep(this.state, {
        input,
        aiService: options.aiService,
      });

      this.stepComplete.emit(this.blueprint.steps.find((step) => step.id === this.state.trace.at(-1)?.stepId)!);

      if (this.state.state === 'bail') {
        throw new Error('Agent unable to follow the blueprint');
      }
    }

    this.end.emit();
  }

  private async _execStep(state: BlueprintMachineState, options: ExecutionOptions): Promise<BlueprintMachineState> {
    const prevStep = this.blueprint.steps.findIndex((step) => step.id === this.state.trace.at(-1)?.stepId);
    if (prevStep === this.blueprint.steps.length - 1) {
      throw new Error('Done execution blueprint');
    }

    const nextStep = this.blueprint.steps[prevStep + 1];
    const onLastStep = prevStep === this.blueprint.steps.length - 2;
    this.stepStart.emit(nextStep);

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
      description: 'This tool reports that the agent has completed the task or is unable to do so',
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
          create(Message, {
            role: 'user',
            content: [taggedDataBlock('input', options.input)],
          }),
        ]
      : [];
    inputMessages.forEach((message) => this.message.emit(message));

    const messages = await session.run({
      systemPrompt: `
        You are a smart Rule-Following Agent.
        Rule-Following Agent executes the command that the user sent in the last message.
        After doing the work, the Rule-Following Agent calls report tool.
        If the Rule-Following agent believes that no action is needed, it calls the report tool with "skipped" status.
        If the Rule-Following Agent is unable to perform the task, it calls the report tool with "bail" status.
        Rule-Following Agent explains the reason it is unable to perform the task before bailing.
        The Rule-Following Agent can express creativity and imagination in the way it performs the task.
        The Rule-Following Agent precisely follows the instructions.
      `,
      history: [...state.history, ...inputMessages],
      tools: [...nextStep.tools, report] as ExecutableTool[], // TODO(burdon): REMOVE CAST!
      artifacts: [],
      client: options.aiService,
      prompt: nextStep.instructions,
    });

    const { messages: trimmedHistory, call: lastBlock } = popLastToolCall(messages);

    if (!lastBlock) {
      // TODO(dmaretskyi): Handle this with grace
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
        Match.withReturnType<BlueprintMachineState['state']>(),
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
