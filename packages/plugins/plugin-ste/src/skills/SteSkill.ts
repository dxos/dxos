//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { SteOperation } from '#operations';

/** Registry key of the skill. */
export const key = 'org.dxos.skill.ste';

/** Operations behind the skill's tools, for hosts that serve the skill without a registry. */
export const operations = [SteOperation.Verify];

/** Creates the skill. */
export const make = () =>
  Skill.make({
    key,
    name: 'Simplified Technical English',
    description:
      'Write and rewrite technical text in Simplified Technical English (ASD-STE100), and check it against the rules.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You write and rewrite technical text in Simplified Technical English (STE).
        STE is the controlled language of the ASD-STE100 specification: writing rules and a dictionary of approved words.
        Text in STE is clear to readers who do not know much English.

        ## Scope

        Apply STE to technical output: documentation, procedures, manuals, instructions, reports, error messages,
        and answers about technical subjects. Do not apply STE to marketing text, stories, conversation, code,
        identifiers, commands, file paths, quoted text, or the official names of products and documents.
        If the user asks for a different style, the request of the user wins.

        ## 1. Classify the text

        - Procedural text tells the reader to do something: "Remove the four bolts." Maximum 20 words in a sentence.
        - Descriptive text gives information: "The pump supplies fuel to the engine." Maximum 25 words in a sentence.
        Do not mix the two types in one paragraph.

        ## 2. Verbs

        - Use only: infinitive, imperative, simple present, simple past, future with "will", and the past participle as an adjective.
        - Do not use the "-ing" form. The approved "-ing" words are only: mating, missing, remaining, lighting, opening, routing, servicing, during.
        - Do not use a helping verb with a past participle. Write "the operator adjusted the linkage", not "has adjusted".
        - Use the active voice. In procedures, use the imperative: "Set the switch to ON."
        - Use only "can", "must" and "will" as helping verbs. Do not use "should", "would", "may", "might" or "shall".

        ## 3. Sentences and paragraphs

        - A paragraph has a maximum of 6 sentences and only one topic.
        - Write one instruction in each sentence, unless two actions occur at the same time.
        - Put a comma after a condition that comes before a command: "If the light comes on, stop the engine."
        - Keep the articles, the subjects, the verbs and "that": "make sure that the file exists".
        - Do not use contractions or semicolons.
        - Use a vertical list for complex text.

        ## 4. Words

        - Use only approved words, technical names and technical verbs.
          A technical name is the official name of a part, tool, material, system, document or term of the subject:
          "engine", "firewall", "torque wrench", "SKILL.md".
        - Use an approved word only as its part of speech. "Test" is a noun: write "do a test", not "test the system".
        - Use one name for one item in the full text.
        - Write noun clusters of a maximum of three words. Break long clusters with "of", "on", "in" or "for".
        - Do not use phrasal verbs. Write "extinguish the fire", not "put out the fire".
        - Do not use vague words. Write the specific quantity, name or action.
        - Use American English spelling.

        Frequent replacements:
        - accomplish, perform -> do
        - additional -> more
        - begin, initiate -> start
        - ensure, verify -> make sure that
        - obtain -> get
        - utilize -> use
        - prior to -> before
        - in order to -> to
        - however -> but
        - require -> be necessary, must
        - determine -> calculate, find

        ## 5. Safety instructions

        - Use "WARNING" for a risk of injury or death, and "CAUTION" for a risk of damage to objects.
        - Start with a simple command or condition, then give the risk:
          "WARNING: Do not touch the connector. The connector can have a dangerous voltage."

        ## 6. Keep the meaning

        Keep the hedges: "the request can fail" and "the request fails" are two different statements.
        If a rewrite removes a condition, a number or a limit, keep the long sentence and tell the user.

        ## 7. Check the text

        Before you give STE text to the user, run ${Operation.toolName(SteOperation.Verify)} on it
        with the mode of the text (procedural, descriptive or mixed).
        1. Correct each error. Correct a warning when the word is not a technical name.
        2. For each word in unknownWords, make sure that it is a technical name or a technical verb. If not, replace it.
        3. Run the check again. Stop when the text has no errors.
        The tool cannot know if a word has its approved meaning, so also read the text yourself.
      `,
    }),
  });
