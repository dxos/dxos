# @dxos/datalog

A small, dependency-free Datalog engine: a parser for a Soufflé-like dialect, static checks, and an
incremental stratified semi-naive evaluator with provenance and pluggable built-ins. It is plain
TypeScript with no Node built-ins, `eval` or threads, so it runs unchanged in the browser, in a
workerd Durable Object and in Node.

## Dialect

```prolog
% Facts and rules; lowercase words and "strings" are the same symbol, numbers are numbers.
edge(a, b).
path(X, Y) :- edge(X, Y).
path(X, Z) :- path(X, Y), edge(Y, Z).

% Stratified negation (`not p(…)`, `!p(…)`), anonymous variables and comparisons.
isolated(X) :- node(X), not path(X, _), X != root.

% Aggregates: count, min, max and sum over a body; variables shared with the rule correlate it.
degree(X, N) :- node(X), N = count : { edge(X, _) }.

% Built-ins are called like relations; `2d` is a symbol, so durations need no quotes.
followup :- elapsed(goal, 2d), not achieved(goal).
```

No disjunction, functions or existential heads: every program terminates.

## Usage

```ts
import { Builtin, Checker, Engine, Parser } from '@dxos/datalog';

const program = Parser.parse(source); // throws Parser.ParseError with line and column
const diagnostics = Checker.check(program, { builtins, relations: { edge: 2 } });

const engine = Engine.make({ program, builtins });
const changes = engine.insert('edge', ['a', 'b']); // only the tuples this insert added or removed
engine.update({ refresh: true }); // re-evaluate volatile built-ins (a clock tick)
engine.provenance('path', ['a', 'b']); // the base tuples one derivation rests on
```

- **Checks** (`Checker.check`) return structured diagnostics: `arity`, `undefined` (when base
  relations are declared), `builtin-head`, `unsafe` (every head variable and every variable under
  `not` or in a comparison must be bound by a positive literal or a built-in mode that binds it) and
  `unstratifiable` (negation or aggregation through recursion).
- **Built-ins** (`Builtin.make`) declare binding modes: `"fb"` means the first argument may be free and
  is bound by the call. A `volatile` built-in (one that reads a clock) is re-evaluated on `refresh`.
- **Incremental evaluation**: insertions propagate semi-naively; a stratum is recomputed and diffed
  only when a relation it reads under negation or aggregation changed, or a relation it reads lost
  tuples. `Changes.added` is the "new binding" signal callers wake on.
- **Provenance**: one derivation is kept per derived tuple (the rule and the tuples its positive
  literals matched). Aggregates and negation contribute no premises.
- **Rewrites**: the AST (`Ast`) is plain data, so a caller rewrites a parsed program (for example,
  expanding predicate shorthand) before checking it.

## Why synchronous

The engine is a pure function of its inputs with no I/O, so it exposes plain synchronous calls rather
than Effects; callers that need Effect wrap a call where it is used. This keeps the hot path (one
evaluation per appended fact) free of fiber overhead and the package free of runtime dependencies.
