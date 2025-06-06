import {
  ConsolePrinter,
  defineTool,
  Message,
  MixedStreamParser,
  ToolResult,
  type AIServiceClient,
  type MessageContentBlock,
} from '@dxos/ai';
import { create } from '@dxos/echo-schema';
import { failedInvariant, invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import chalk from 'chalk';
import { Match, Schema } from 'effect';
import type { Blueprint } from './blueprint';
import { Session } from 'inspector/promises';
import { AISession } from '../session';
import { log } from '@dxos/log';

type BlueprintMachineState = {
  history: Message[];
  currentStep: ObjectId | null;
  state: 'working' | 'bail' | 'done';
};

const INITIAL_STATE: BlueprintMachineState = {
  history: [],
  currentStep: null,
  state: 'working',
};

type ExecutionOptions = {
  aiService: AIServiceClient;

  /**
   * Input to the blueprint.
   */
  input?: unknown;
};

export class BlueprintMachine {
  constructor(readonly blueprint: Blueprint) {}

  state: BlueprintMachineState = structuredClone(INITIAL_STATE);

  async runToCompletion(opts: ExecutionOptions): Promise<void> {
    let firstStep = true;
    while (this.state.state !== 'done') {
      const input = firstStep ? opts.input : undefined;
      firstStep = false;
      this.state = await this._execStep(this.state, {
        input,
        aiService: opts.aiService,
      });

      if (this.state.state === 'bail') {
        throw new Error('Agent unable to follow the blueprint');
      }
    }
  }

  private async _execStep(state: BlueprintMachineState, opts: ExecutionOptions): Promise<BlueprintMachineState> {
    const prevStep = this.blueprint.steps.findIndex((step) => step.id === state.currentStep);
    if (prevStep === this.blueprint.steps.length - 1) {
      throw new Error('Done execution blueprint');
    }

    log.info('executing', { history: state.history.length });

    const nextStep = this.blueprint.steps[prevStep + 1];
    const onLastStep = prevStep === this.blueprint.steps.length - 2;
    console.log(
      `\n${chalk.magenta(`${chalk.bold(`STEP ${prevStep + 2} of ${this.blueprint.steps.length}:`)} ${nextStep.instructions}`)}\n`,
    );

    const ReportSchema = Schema.Struct({
      status: Schema.Literal('done', 'bailed', 'skipped').annotations({
        description: 'The status of the task completion',
      }),
    });
    const report = defineTool('system', {
      name: 'report',
      description: 'This tool reports that the agent has completed the task or is unable to do so',
      schema: ReportSchema,
      execute: async (input) => ToolResult.Break(input),
    });

    const session = new AISession({
      operationModel: 'configured',
    });

    const printer = new ConsolePrinter();
    session.userMessage.on((message) => printer.printMessage(message));
    session.message.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));

    const inputMessages = opts.input
      ? [
          create(Message, {
            role: 'user',
            content: [taggedDataBlock('input', opts.input)],
          }),
        ]
      : [];
    inputMessages.forEach((message) => printer.printMessage(message));

    const messages = await session.run({
      systemPrompt: `
               You are a smart Rule-Following Agent.
               Rule-Following Agent executes the command that the user sent in the last message.
               After doing the work, the Rule-Following Agent calls report tool.
               If the Rule-Following agent believes that no action is needed, it calls the report tool with "skipped" status.
               If the Rule-Following Agent is unable to perform the task, it calls the report tool with "bail" status.
               Rule-Following Agent explains the reason it is unable to perform the task before bailing.
               The Rule-Following Agent can express creativity and imagination in the way it performs the task as long as it follows the instructions.
             `,
      history: [...state.history, ...inputMessages],
      tools: [...nextStep.tools, report],
      artifacts: [],
      client: opts.aiService,
      prompt: nextStep.instructions,
    });

    // Pop the last tool call block
    const lastBlock = messages.at(-1)?.content.at(-1);
    invariant(lastBlock?.type === 'tool_use');
    const trimmedHistory = [
      ...messages.slice(0, -1),
      {
        ...messages.at(-1)!,
        content: [...messages.at(-1)!.content.slice(0, -1)],
      } satisfies Message,
    ];
    const output = ReportSchema.pipe(Schema.decodeUnknownSync)(lastBlock.input);

    return {
      history: [...state.history, ...inputMessages, ...trimmedHistory],
      currentStep: nextStep.id,
      state: Match.value(output.status).pipe(
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
