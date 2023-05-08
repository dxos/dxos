import { Event, sleep } from "@dxos/async";
import { PublicKey } from "@dxos/keys";
import { ChildProcess, fork } from "child_process";
import { AgentParams, TestPlan } from "./spec-base";
import * as fs from 'fs'
import { log } from "@dxos/log";
import { join } from "path";

type PlanOptions = {
  staggerAgents?: number;
};

export type RunPlanParams<S, C> = {
  plan: TestPlan<S, C>
  spec: S,
  options: PlanOptions
}

export const runPlan = async <S, C>({plan, spec, options}: RunPlanParams<S, C>) => {
  if (!process.env.GRAVITY_AGENT_PARAMS) { // Planner mode
    await runPlanner({plan, spec, options});
  } else { // Agent mode
    const params: AgentParams<S, C> = JSON.parse(process.env.GRAVITY_AGENT_PARAMS);
    await runAgent(plan, params)
  }
}

const runPlanner = async <S, C>({plan, spec, options}: RunPlanParams<S, C>) => {
  const testId = genTestId()
  const outDir = `${process.cwd()}/out/results/${testId}`
  fs.mkdirSync(outDir, { recursive: true })

  log.info('starting plan', {
    outDir
  })

  const agentsArray = await plan.configurePlan({
    spec,
    outDir,
    testId,
  })
  const agents = Object.fromEntries(agentsArray.map(config => ([
    PublicKey.random().toHex(),
    config,
  ])))

  log.info('starting agents', {
    count: agentsArray.length
  })

  const children: ChildProcess[] = []

  for(const [agentId, agentConfig] of Object.entries(agents)) {
    const agentParams: AgentParams<S, C> = {
      agentId,
      spec,
      agents,
      outDir: join(outDir, agentId),
      config: agentConfig
    }

    if(options.staggerAgents !== undefined && options.staggerAgents > 0) {
      await sleep(options.staggerAgents)
    }

    fs.mkdirSync(agentParams.outDir, { recursive: true })

    const childProcess = fork(process.argv[1], {
      env: {
        ...process.env,
        GRAVITY_AGENT_PARAMS: JSON.stringify(agentParams)
      }
    })
    children.push(childProcess)
  }

  await Promise.all(children.map(child => Event.wrap(child, 'exit').waitForCount(1)))

  log.info('test complete')

  await plan.cleanupPlan()

  log.info('cleanup complete')
}

const runAgent = async <S, C>(plan: TestPlan<S, C>, params: AgentParams<S, C>) => {
  try {
    await plan.agentMain(params)
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

const genTestId = () => `${new Date().toISOString().slice(0, -5)}-${PublicKey.random().toHex().slice(0, 4)}`