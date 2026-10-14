# Core

Core is the small language every DEUS definition compiles to. It is the input to hashing,
the format of codebase objects, and the only thing the kernel runs. It is written as
canonical S-expressions: single spaces, no trailing space, strings escaped as below.

## Text format

| Atom    | Form                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------- |
| integer | `-12` (32-bit)                                                                                                       |
| symbol  | `lam`, `app` …                                                                                                       |
| string  | `"…"` with `\"`, `\\`, `\n`, `\t`, `\r`, and `\uXXXX` for other control characters; everything else is literal UTF-8 |

The printer in [`src/kernel/sexp.ts`](../src/kernel/sexp.ts) and [`deus/sexp.deus`](../deus/sexp.deus)
must agree byte for byte, because hashes are SHA-256 of this text.

## Terms

Variables are de Bruijn indices: `(var 0)` is the innermost binder.

| Term                                      | Meaning                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `(var i)`                                 | a local                                                                     |
| `(ref "h")`                               | a definition, by hash                                                       |
| `(int n)`, `(text "s")`                   | literals                                                                    |
| `(lam b)`                                 | a one-argument function; nested lambdas are curried                         |
| `(app f a …)`                             | application; extra arguments apply the result                               |
| `(let v b)`                               | `v` bound in `b`                                                            |
| `(seq a b)`                               | evaluate `a`, discard it, then `b`                                          |
| `(letrec (f₁ … fₙ) b)`                    | recursive functions; inside, `fₙ` is `(var 0)`                              |
| `(if c t e)`                              | `c` is a `Bool`                                                             |
| `(con "T" tag arity)`                     | a constructor as a value (curried when `arity > 0`)                         |
| `(match s (case p b) …)`                  | first matching case wins; a pattern binds left to right                     |
| `(op "A" index arity)`                    | an ability operation as a value; saturating it performs a request           |
| `(handle b (ret r) (on "A" index n h) …)` | deep handler; `h` binds the `n` arguments then the continuation (`(var 0)`) |
| `(prim "name")`                           | a kernel primitive (see `deus/builtins.deus`)                               |

## Patterns

`(pany)`, `(pvar)`, `(pas p)` (binds the whole value, then `p`'s variables), `(pint n)`,
`(ptext "s")`, `(pcon "T" tag p …)`.

## Builtin identities

A type or ability whose IRI starts with `#` uses the IRI as its hash; the kernel constructs and
matches these values itself: `#Unit`, `#Bool` (`false` = 0, `true` = 1), `#List` (`nil`, `cons`),
`#Option` (`none`, `some`), `#Pair`, `#Int`, `#Text`, `#Ref`, and the abilities `#IO` and
`#Defect`.

## Objects

| Object          | Hashed form                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| term            | `(term core)`                                                                                                                         |
| recursive group | `(cycle (term …) …)` with in-group references as `(self i)`; member `i` is `<hash>.i` (or `<hash>` alone for a single recursive term) |
| test            | `(test core)`                                                                                                                         |
| theorem         | `(theorem (binders type …) prop (proof "tactic" …))`                                                                                  |
| type            | `(type "iri" params (ctor arity field-type …) …)`                                                                                     |
| ability         | `(ability "iri" params (op arity type) …)`                                                                                            |
| namespace       | `(ns (n "name" entry) …)`                                                                                                             |
| history         | `(causal (ns "h") (parents "h" …) (msg "…"))`                                                                                         |

Stored term objects have `(self i)` already replaced by member hashes, so they run as they are.
Binder names never enter a hash; they are kept in metadata (`(meta (locals "x" …))`) in the order
the binders appear.

## Images

An image is the closure of one definition: `(def "h" core)` forms sorted by hash, then
`(main "h")`. The kernel calls `main` with `()`. `seed/deus.image` is the image of `Cli.main`.
