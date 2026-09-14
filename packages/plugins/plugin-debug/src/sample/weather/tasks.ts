//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { FORECAST_URL, daysAgo } from './util.ts';

//
// Four steps, flat and in order, all the agent's: nothing here needs the reader, so a chat can run
// the plan end to end on its own. Each depends on the one before it, so a runner working ahead is
// visibly out of order rather than merely early.
//

type TaskSeed = {
  readonly title: string;
  readonly description: string;
  readonly estimate?: Task.Estimate;
};

const STEPS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Build the weather MCP Worker',
    description: `One sandbox for the run. A TypeScript Worker that speaks MCP over Streamable HTTP on one endpoint — \`initialize\`, \`tools/list\` and \`tools/call\` — with exactly one tool, \`get_weather\`, taking \`latitude\` and \`longitude\` and returning the current temperature and wind speed plus the hourly series from ${FORECAST_URL} with those coordinates substituted. The MCP client runs in the browser, so every response must carry CORS headers and an \`OPTIONS\` preflight must answer 204: \`Access-Control-Allow-Origin: *\`, \`Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\`, \`Access-Control-Allow-Headers\` covering \`content-type\`, \`accept\`, \`authorization\`, \`mcp-session-id\` and \`mcp-protocol-version\`, and \`Access-Control-Expose-Headers: mcp-session-id\`. No auth, no dependencies beyond wrangler. The client is the MCP TypeScript SDK's Streamable HTTP transport, and it needs more than the three methods: answer every request with \`Content-Type: application/json\` and a JSON-RPC response object at HTTP 200 — an unknown method too, as a JSON-RPC error, never a 4xx; in \`initialize\` echo the \`protocolVersion\` the client sent, with \`capabilities: { tools: {} }\` and a \`serverInfo\`; answer any notification (a message with no \`id\`, such as \`notifications/initialized\`) with 202 and no body, since a client whose notification gets a 4xx never finishes connecting; answer \`GET\` and \`DELETE\` on the endpoint with 405. Return the tool's result as \`{ content: [{ type: 'text', text: <the forecast as JSON> }] }\`. \`--temporary\` needs wrangler 4.102+, which needs Node 22 while the sandbox runs Node 20: install \`wrangler@latest\` and run it as \`npx --yes node@22 node_modules/wrangler/bin/wrangler.js\`.`,
    estimate: 's',
  },
  {
    title: 'Deploy it to a temporary Cloudflare account',
    description:
      '`wrangler deploy --temporary` — plain `wrangler deploy` demands a token non-interactively. File the Worker URL on the project. Do not claim the account and do not file or repeat the claim URL: it is a bearer credential, and this run never needs it.',
    estimate: 'xs',
  },
  {
    title: 'Configure the server for this space',
    description:
      "Set the Worker URL on the Weather MCP skill's `mcpServers` as `{ name: 'weather', url, protocol: 'http' }` through the Database skill's update tool. The skill is already bound to this chat and servers are connected at the start of every turn, so `get_weather` appears on your next turn — no restart.",
    estimate: 'xs',
  },
  {
    title: 'Test the tool from this chat',
    description:
      'Before calling, check CORS against the deployed URL — `curl -i -X OPTIONS -H "Origin: http://localhost" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type,mcp-session-id" <url>` must return the allow headers; a browser client fails its preflight otherwise, and the tool never appears. Then call `get_weather` for Berlin (52.52, 13.41) and file the response on the project. The call has to appear as a tool call in the transcript; a forecast the model produced on its own is a failure, not a pass.',
    estimate: 'xs',
  },
];

export type TasksResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[] };

/** The four steps, each depending on the one before it. */
export const Tasks: SampleSpace.Phase<TasksResult> = SampleSpace.phase('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task],
  run: () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({
          name: 'Weather MCP',
          description: 'From an empty sandbox to a weather tool this chat calls.',
        }),
      );

      const tasks = STEPS.map((step) =>
        Task.make({
          title: step.title,
          description: step.description,
          estimate: step.estimate,
          status: 'todo',
          // Task carries no due date; its dates are activity-log lines, so that is where they go.
          history: [
            { date: daysAgo(0), event: 'created' as const, description: 'Filed from the weather MCP template.' },
          ],
        }),
      );
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      for (const [index, task] of tasks.entries()) {
        if (index > 0) {
          const previous = tasks[index - 1];
          Obj.update(task, (task) => {
            task.dependsOn = [Ref.make(previous)];
          });
        }
      }

      return { taskSet, tasks };
    }),
});
