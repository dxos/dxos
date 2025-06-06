import { ConsolePrinter, defineTool, isToolUse, Message, MixedStreamParser, type AIServiceClient } from '@dxos/ai';
import { create } from '@dxos/echo-schema';
import { failedInvariant, invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { Match, Schema } from 'effect';

export type Blueprint = {
  steps: BlueprintStep[];
};

export const Blueprint = Object.freeze({
  make: (steps: string[]) => {
    return {
      steps: steps.map((step, index) => ({
        id: ObjectId.random(),
        instructions: step,
      })),
    };
  },
});

type BlueprintStep = {
  id: ObjectId;
  instructions: string;
};

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
};

export class BlueprintMachine {
  constructor(readonly blueprint: Blueprint) {}

  state: BlueprintMachineState = structuredClone(INITIAL_STATE);

  async runToCompletion(opts: ExecutionOptions): Promise<void> {
    while (this.state.state !== 'done') {
      this.state = await this._execStep(this.state, opts);
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
    const nextStep = this.blueprint.steps[prevStep + 1];
    const onLastStep = prevStep === this.blueprint.steps.length - 2;

    console.log(`\n\x1b[35mSTEP ${prevStep + 2} of ${this.blueprint.steps.length}: ${nextStep.instructions}\x1b[0m\n`);

    const ReportSchema = Schema.Struct({
      status: Schema.Literal('done', 'bailed').annotations({
        description: 'The status of the task completion',
      }),
    });
    const report = defineTool('system', {
      name: 'report',
      description: 'This tool reports that the agent has completed the task or is unable to do so',
      schema: ReportSchema,
      execute: () => failedInvariant(),
    });

    const parser = new MixedStreamParser();
    const printer = new ConsolePrinter();
    parser.message.on((message) => printer.printMessage(message));
    parser.block.on((block) => printer.printContentBlock(block));
    const prompt = create(Message, {
      role: 'user',
      content: [
        {
          type: 'text',
          text: nextStep.instructions,
        },
      ],
    });
    printer.printMessage(prompt);

    const messages = await parser.parse(
      await opts.aiService.execStream({
        systemPrompt: `
          You are a smart Rule-Following Agent.
          Rule-Following Agent executes the command that the user sent in the last message.
          After doing the work, the Rule-Following Agent calls report tool.
          If the Rule-Following Agent is unable to perform the task, it calls the report tool with a bail status.
          Rule-Following Agent explains the reason it is unable to perform the task before bailing.
          The Rule-Following Agent can express creativity and imagination in the way it performs the task as long as it follows the instructions.
        `,
        history: [...state.history, prompt],
        model: '@anthropic/claude-3-5-sonnet-20241022',
        tools: [report],
      }),
    );

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
      history: [...state.history, prompt, ...trimmedHistory],
      currentStep: nextStep.id,
      state: Match.value(output.status).pipe(
        Match.withReturnType<BlueprintMachineState['state']>(),
        Match.when('done', () => (onLastStep ? 'done' : 'working')),
        Match.when('bailed', () => 'bail'),
        Match.exhaustive,
      ),
    };
  }
}
