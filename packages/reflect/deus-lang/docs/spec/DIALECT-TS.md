# The TypeScript-like dialect

DEUS stores code as Core (see [CORE.md](./CORE.md)), not as text. A dialect is one way to print that
Core. DEUS syntax ([LANGUAGE.md](./LANGUAGE.md)) is the primary dialect: agents and people write it, and
`deus view` prints it so that it compiles back to the same hashes. The TypeScript-like dialect (D70) is a
second view of the same definitions, for readers who know JavaScript or TypeScript.

- **Writer:** `deus view --dialect ts` ([`deus/ts.deus`](../../deus/ts.deus)), and `deus explore`,
  which stores it as the `ts` field of each definition page ([EXPLORER.md](./EXPLORER.md)).
- **Reader:** people. Nothing parses it yet; it is not valid TypeScript.

## Names

Names are the same as in DEUS: references print under their shortest unique name, and locals print under
the names the author gave them (`Resolve.strip` keeps them in binder order). The printer draws local names
in the same order as the DEUS printer, so both dialects show the same names.

## Definitions

| Core                                   | DEUS                                  | TypeScript-like                       |
| -------------------------------------- | ------------------------------------- | ------------------------------------- |
| term with parameters                   | `def f (x : A) : {E} B := …`          | `function f<a>(x: A): B uses E { … }` |
| term without parameters                | `def c : T := e`                      | `const c: T = e;`                     |
| test                                   | `test t := e`                         | `test("t", () => e);`                 |
| theorem                                | `theorem t (x : A) : p := by tac`     | `theorem t(x: A): p by tac;`          |
| structure                              | `structure P where x : Int`           | `interface P { x: Int; }`             |
| inductive type                         | `inductive O a where \| some (v : a)` | `type O<a> = \| some(v: a);`          |
| ability                                | `ability A where op : X -> Y`         | `ability A { op(X): Y; }`             |
| a declared IRI that is not the default | `@"iri"` after the name               | `@iri("iri")` on the line before      |

A doc comment prints as `/** … */`. Header lines from `deus view` start with `// ` instead of `-- `. The
type parameters of a `function` are the type variables of its signature, in order of first occurrence.
When a `function` header passes 100 columns, each parameter goes on a line of its own.

## Statements

A function body is a list of statements whose last one returns.

| Core                              | Statement                                               |
| --------------------------------- | ------------------------------------------------------- |
| `(let v b)`                       | `const x = v;` then `b`                                 |
| `(seq a b)`                       | `a;` then `b`                                           |
| `(letrec (f …) b)`                | `function f(x) { … }` then `b`                          |
| `(match s (case p e) …)`          | `switch (s) { case p: …  default: … }` (`_` is default) |
| `(handle b (ret e) (on A i n e))` | `try { b } handle { return(x) { … } A.op(x, k) { … } }` |
| `(if c a b)` with a block branch  | `if (c) { … } else if (d) { … } else { … }`             |
| anything else                     | `return e;`                                             |

A block in expression position is a `do { … }` expression (the TC39 proposal); its last statement is its
value and does not `return`.

## Expressions

| Core                                         | TypeScript-like                          |
| -------------------------------------------- | ---------------------------------------- |
| application `f a b`                          | `f(a, b)`                                |
| application to unit `f ()`                   | `f()`                                    |
| lambda `fun x y => e`                        | `(x, y) => e`; `fun _ => e` is `() => e` |
| field accessor `p.x`                         | `p.x`                                    |
| `if c then a else b`                         | `c ? a : b`                              |
| `a && b`, `a \|\| b`, `-a`, `==`, `<`, `*` … | unchanged                                |
| `a ++ b` (text or list append)               | `a + b`                                  |
| list `[a, b]`, cons `h :: t`                 | `[a, b]`, `[h, ...t]`                    |
| tuple `(a, b)`                               | `#[a, b]` (the TC39 tuple syntax)        |
| `()`                                         | `undefined`                              |
| `prim "name"`                                | `prim("name")`                           |

An application or a list that passes 100 columns puts each argument on a line of its own; a long chain of
one infix operator breaks after the operator.

## Patterns

`_`, variables and literals are unchanged. A constructor pattern is `C(p, q)`, a cons pattern `[h, ...t]`
(and `[a, b, ...t]` for nested ones), a tuple pattern `#[a, b]`, and an as-pattern `x @ p`.

## Types

| DEUS                  | TypeScript-like             |
| --------------------- | --------------------------- |
| `List a`              | `List<a>`                   |
| `(A, B)`              | `#[A, B]`                   |
| `A -> B -> C`         | `(A, B) => C`               |
| `Unit -> A`           | `() => A`                   |
| `A -> {IO, E \| r} B` | `(A) => B uses IO, E, ...r` |

An effectful function type inside a comma-separated list (parameters, type arguments, tuple items) is
parenthesized: `body: (() => a uses Prices, ...r)`. Type names are the codebase's (`Int`, `Text`, `Bool`),
not TypeScript's.

## Not covered

- Parsing the dialect back into Core (codebase task "Parse the TypeScript-like dialect back into Core").
- `--core` output and `.mdl` spec entries print as in DEUS.
