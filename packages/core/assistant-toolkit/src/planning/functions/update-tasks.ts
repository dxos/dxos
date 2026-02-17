import { Effect, Schema } from 'effect';
import { defineFunction } from '@dxos/functions';
import * as Initiative from '../../initiative';
import { AiContextService } from '@dxos/assistant';

import { trim } from '@dxos/util';
import type { Mutable } from 'effect/Types';
import { Database, Obj } from '@dxos/echo';

const INSTRUCTIONS = trim`
TASK MANAGEMENT TOOL - USAGE GUIDELINES

This tool maintains an organized task list during work sessions to track progress, break down objectives, and ensure thoroughness. After creating initial tasks, update them silently without announcing changes to the user.

=== CORE USAGE PRINCIPLES ===

Create and manage tasks for: multi-step objectives requiring 3+ distinct actions, complex projects needing careful sequencing, user requests for task organization, multiple deliverables provided together, new instructions (capture as tasks immediately with new IDs), completed work (mark done and add follow-ups), and active work (mark as 'in-progress', limit one at a time).

Skip task management for: single straightforward actions, simple requests achievable in 1-2 steps, informational queries, quick lookups or clarifications, and avoid creating verification tasks unless requested.

=== TOOL SPECIFICATION ===

update-tasks requires an array of task objects. Each task object contains:
- id (string, required): unique identifier like "task_1" or "research_sources"
- title (string, optional): update to clarify or refine task description
- status (string, optional): 'todo' | 'in-progress' | 'done'

Task status meanings: 'todo' means not yet started, 'in-progress' means currently being worked on, 'done' means completed successfully.

=== OPERATIONAL GUIDELINES ===

Update tasks in real-time as work progresses. Mark tasks 'done' immediately upon completion. Maintain only ONE task with 'in-progress' status at a time. Complete current tasks before starting new ones. Use specific, actionable task titles. Break complex work into manageable logical pieces. Batch task updates with other actions when possible for efficiency.

=== USAGE EXAMPLES ===

<example type="research_project">
<user_message>I need to research sustainable packaging options and write a report comparing costs and environmental impact.</user_message>
<assistant_action>
Creates tasks:
1. {id: "research_materials", title: "Research sustainable packaging materials", status: "in-progress"}
2. {id: "compare_costs", title: "Compile cost comparison data", status: "todo"}
3. {id: "assess_impact", title: "Evaluate environmental impact metrics", status: "todo"}
4. {id: "draft_report", title: "Write comparative analysis report", status: "todo"}

Begins research work immediately in same response.
</assistant_action>
<reasoning>Multi-phase project requiring systematic tracking across research, analysis, and writing stages.</reasoning>
</example>

<example type="event_planning">
<user_message>Help me plan a team retreat - venue, agenda, catering, and send invitations.</user_message>
<assistant_action>
Creates tasks:
1. {id: "venue_options", title: "Research and recommend venues", status: "in-progress"}
2. {id: "draft_agenda", title: "Create retreat agenda", status: "todo"}
3. {id: "arrange_catering", title: "Coordinate catering options", status: "todo"}
4. {id: "send_invites", title: "Draft and send invitations", status: "todo"}
</assistant_action>
<reasoning>Multiple distinct deliverables with dependencies requiring organized tracking.</reasoning>
</example>

<example type="document_analysis">
<user_message>Review this 30-page contract for key terms, risks, and negotiation points.</user_message>
<assistant_action>
Creates tasks:
1. {id: "extract_key_terms", title: "Identify key contractual terms", status: "in-progress"}
2. {id: "flag_risks", title: "Flag potential risks and liabilities", status: "todo"}
3. {id: "negotiation_points", title: "Compile negotiation recommendations", status: "todo"}
4. {id: "summary_doc", title: "Prepare executive summary", status: "todo"}
</assistant_action>
<reasoning>Substantial analysis work requiring methodical breakdown and systematic review.</reasoning>
</example>

<example type="multiple_deliverables">
<user_message>I need: 1) competitor analysis for three companies, 2) SWOT analysis, 3) market positioning recommendations.</user_message>
<assistant_action>
Creates tasks:
1. {id: "competitor_research", title: "Research three competitor companies", status: "in-progress"}
2. {id: "swot_analysis", title: "Develop SWOT analysis", status: "todo"}
3. {id: "positioning_recs", title: "Create market positioning recommendations", status: "todo"}
</assistant_action>
<reasoning>User provided numbered list of distinct deliverables requiring separate effort.</reasoning>
</example>

<example type="skip_simple_question">
<user_message>What's the difference between renewable and sustainable energy?</user_message>
<assistant_action>Provides explanation directly without creating tasks.</assistant_action>
<reasoning>Informational request with no actionable work to complete or track.</reasoning>
</example>

<example type="skip_quick_lookup">
<user_message>Find the population of Tokyo.</user_message>
<assistant_action>Searches and provides answer without task tracking.</assistant_action>
<reasoning>Single straightforward lookup completable immediately.</reasoning>
</example>

<example type="skip_trivial_task">
<user_message>Summarize this 2-paragraph email.</user_message>
<assistant_action>Provides summary directly without creating tasks.</assistant_action>
<reasoning>Single simple action requiring no breakdown or progress tracking.</reasoning>
</example>

<example type="skip_single_action">
<user_message>Check if my flight is on time.</user_message>
<assistant_action>Performs lookup and reports status without task management.</assistant_action>
<reasoning>One-step action with immediate completion, no organizational benefit from tasks.</reasoning>
</example>

=== BEST PRACTICES ===

For task creation: use descriptive unique IDs reflecting the work, start first task as 'in-progress', batch initial creation with beginning work. For progress tracking: update status immediately upon completion, keep only one 'in-progress' task unless parallel work is natural, add follow-up tasks as they emerge. For task breakdown: aim for reasonably-scoped tasks, group related small actions into logical units, split tasks requiring different approaches.

When uncertain whether to use task management, err on the side of creating tasks. Proactive organization demonstrates thoroughness and ensures comprehensive work completion.
`;

const TaskProps = Schema.Struct({
  id: Initiative.TaskId,
  title: Schema.String,
  status: Schema.Literal('todo', 'in-progress', 'done'),
});

export default defineFunction({
  key: 'dxos.org/function/planning/update-tasks',
  name: 'Update tasks',
  description: INSTRUCTIONS,
  inputSchema: Schema.Struct({
    tasks: Schema.Array(TaskProps),
  }),
  handler: Effect.fn(function* ({ data: { tasks: newTasks } }) {
    const initiative = yield* Initiative.getFromChatContext;
    const plan = yield* Database.load(initiative.plan);

    Obj.change(plan, (plan) => {
      for (const task of newTasks) {
        const existingTask = plan.tasks.find((t) => t.id === task.id);
        if (existingTask) {
          existingTask.title = task.title;
          existingTask.status = task.status;
        } else {
          plan.tasks.push({
            id: task.id,
            title: task.title,
            status: task.status,
          });
        }
      }
    });

    // console.log('\n====== TASKS ======\n');
    // for (const task of tasks) {
    //   console.log(`- **${task.status?.toLocaleUpperCase()}**: ${task.title ?? 'No title'} (id: ${task.id})`);
    // }
    // console.log('\n====== END TASKS ======\n');

    return `
      Tasks updated. Don't forget to mark tasks as done when you're done with them or update their status to 'in-progress' when you start working on them.
      Current plan:
      <plan>
        ${Initiative.formatPlan(plan)}
      </plan>
    `;
  }, AiContextService.fixFunctionHandlerType),
});
