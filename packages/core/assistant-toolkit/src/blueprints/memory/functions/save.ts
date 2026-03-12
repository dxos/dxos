//
// Copyright 2026 DXOS.org
//

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Database, Entity, Obj } from "@dxos/echo";
import { defineFunction } from "@dxos/functions";

import { Memory } from "../../../types/Memory";

export default defineFunction({
  key: "dxos.org/function/memory/save",
  name: "Save memory",
  description:
    "Saves a new memory to the database. Use this to persist knowledge, facts, preferences, or any information that should be remembered across conversations.",
  inputSchema: Schema.Struct({
    title: Schema.String.annotations({
      description: "Short descriptive title for the memory.",
    }),
    content: Schema.String.annotations({
      description:
        "The content of the memory. Can be a fact, preference, instruction, or any knowledge worth persisting.",
    }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fn(function* ({ data: { title, content } }) {
    const memory = yield* Database.add(Obj.make(Memory, { title, content }));
    return Entity.toJSON(memory);
  }),
});
