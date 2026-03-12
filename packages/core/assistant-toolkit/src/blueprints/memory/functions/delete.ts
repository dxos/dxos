//
// Copyright 2026 DXOS.org
//

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Database, Filter, Obj, Query, Ref } from "@dxos/echo";
import { defineFunction } from "@dxos/functions";

import { Memory } from "../../../types/Memory";

export default defineFunction({
  key: "dxos.org/function/memory/delete",
  name: "Delete memory",
  description:
    "Deletes a memory from the database. Use this to remove outdated or incorrect memories.",
  inputSchema: Schema.Struct({
    memory: Ref.Ref(Memory),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { memory } }) {
    const memoryObj = yield* Database.load(memory);
    yield* Database.remove(memoryObj);
  }),
});
