//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Sheet, SheetOperation } from '#types';

const operations = [SheetOperation.GetValues, SheetOperation.SetValues];

const make = () =>
  Skill.make({
    key: Sheet.SKILL_KEY,
    name: 'Sheet',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are an expert at working with spreadsheets.
        The context object represents a Sheet — a collaborative spreadsheet backed by ECHO.

        ## Reading data

        Use the \`getValues\` tool to read cell values from the sheet.
        It returns a 2D array indexed [row][col] and the A1 range it covers.
        Omit the \`range\` parameter to read the entire occupied area.
        Use \`getCellValue\` to read a single cell.

        ## Writing data

        Use \`setValues\` to write multiple cells at once (preferred for bulk updates).
        Use \`setCellValue\` to write a single cell.
        Cell values can be plain scalars (string, number, boolean) or formula strings starting with "=".
        Formula examples: "=SUM(A1:A5)", "=A1*B1", "=IF(C2>0,\"yes\",\"no\")".
        Over 400 HyperFormula functions are available: arithmetic, statistical, text, date/time, financial, logical.

      `,
    }),
  });

const skill: Skill.Definition = {
  key: Sheet.SKILL_KEY,
  make,
};

export default skill;
