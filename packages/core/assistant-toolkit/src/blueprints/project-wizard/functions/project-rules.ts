//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';
import { trim } from '@dxos/util';

import { ProjectRules } from './definitions';

export default ProjectRules.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      return trim`
        You can ask the user for qualifying questions about the projects.
        If projects should actively read incoming emails, query for mailboxes and add a subscription to them.
        Use [query-blueprints] from the Blueprint Manager to query for available blueprints and their keys.
        Use [create-project] function to create a new project.
        After creating a project, explicitly remind the user to enable local triggers so the project can be driven autonomously.

        Notable blueprints (query to get their keys):

        - Database -- CRUD on objects in the ECHO database.
        - Markdown -- Create and edit markdown documents.
        - Websearch -- Search the web for information.
        - Browser -- Virtual browser via playwright when simple WebSearch is not enough.
        - Memory -- Memory to store and retrieve information.

        Experimental blueprints that are discoraged:

        - Research
        - Design
        - Project (not wizard) -- those are project internals, they are auto-added to every new project.

        <example_project>
          ## CRM from your inbox

          Blueprints: database, websearch, browser

          Subscribe to your inboxes.
          Spec says that on every email we should extract People and Organizations and save them to the database, but first query the database for existing people and organizations to avoid duplicates.
          Also run a quick research on the web to find more information about the person or organization and save it to the database.
        </example_project>

        <example_project>
          ## Parcel tracking

          Blueprints: database

          Based on emails from vendors (amazon, fedex, etc.) track the status of the parcels ordered online and keep a table of orders.

          Before creating a project, use the Database blueprint to create an Order schema:
            - seller
            - name
            - price
            - status (enum of: pending, shipped, waiting for pickup, delivered, cancelled, returned)
            - tracking numbers/notes
            - date of delivery
            - shipping address
        </example_project>

        <example_project>
          ## Comms assistant

          Blueprints: database, markdown, inbox

          Helps user maintain comms with external parites via email.
          Ask user specifically who they want to communicate with and on what topic.
          Project should keep a markdown document in artifacts outlining the current state of the comms.
          Project should propose drafts to follow up on the comms. Only propose sensible drafts, do not propose drafts that are not relevant or actionable.
        </example_project>
      `;
    }),
  ),
);
