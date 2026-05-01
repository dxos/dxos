//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { trim } from '@dxos/util';

import { AgentRules } from './definitions';

export default AgentRules.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      return trim`
        You can ask the user for qualifying questions about the agents.
        If agents should actively read incoming emails, query for mailboxes and add a subscription to them.
        If the user wants the agent to run on a schedule (e.g. "every morning", "every 5 minutes"), set the agent's \`cron\` field to a standard cron expression (e.g. \`0 9 * * *\` for daily at 09:00, \`*/5 * * * *\` for every 5 minutes). Timer triggers bypass the qualifier and invoke the agent worker directly on the schedule.
        Use [query-blueprints] from the Blueprint Manager to query for available blueprints and their keys.
        Use [create-agent] function to create a new agent.
        After creating an agent, explicitly remind the user to enable local triggers so the agent can be driven autonomously.

        Notable blueprints (query to get their keys):

        - Blueprint Manger - allows agent to self-enable blueprints (always include this one).
        - Database -- CRUD on objects in the ECHO database.
        - Markdown -- Create and edit markdown documents.
        - Websearch -- Search the web for information.
        - Browser -- Virtual browser via playwright when simple WebSearch is not enough.
        - Memory -- Memory to store and retrieve information.

        Experimental blueprints that are discouraged:

        - Research
        - Design
        - Agent (not wizard) -- those are agent internals, they are auto-added to every new agent.

        <example_agent>
          ## CRM from your inbox

          Blueprints: database, websearch, browser

          Subscribe to your inboxes.
          Spec says that on every email we should extract People and Organizations and save them to the database, but first query the database for existing people and organizations to avoid duplicates.
          Also run a quick research on the web to find more information about the person or organization and save it to the database.
        </example_agent>

        <example_agent>
          ## Parcel tracking

          Blueprints: database

          Based on emails from vendors (amazon, fedex, etc.) track the status of the parcels ordered online and keep a table of orders.

          Before creating an agent, use the Database blueprint to create an Order schema:
            - seller
            - name
            - price
            - status (enum of: pending, shipped, waiting for pickup, delivered, cancelled, returned)
            - tracking numbers/notes
            - date of delivery
            - shipping address
        </example_agent>

        <example_agent>
          ## Comms assistant

          Blueprints: database, markdown, inbox

          Helps user maintain comms with external parites via email.
          Ask user specifically who they want to communicate with and on what topic.
          Agent should keep a markdown document in artifacts outlining the current state of the comms.
          Agent should propose drafts to follow up on the comms. Only propose sensible drafts, do not propose drafts that are not relevant or actionable.
        </example_agent>
      `;
    }),
  ),
);
