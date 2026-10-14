# DEUS language

This is the surface language of DEUS: the text in `.deus` files and in the ` ```deus ` fences of
`.mdl` documents. People and agents write it; `deus view` prints it back. The compiler reads it in four
stages, each written in DEUS: the lexer [`deus/lexer.deus`](../../deus/lexer.deus), the parser
[`deus/parser.deus`](../../deus/parser.deus) (which builds the tree in [`deus/syntax.deus`](../../deus/syntax.deus)),
the resolver [`deus/resolve.deus`](../../deus/resolve.deus) and the batch compiler
[`deus/compile.deus`](../../deus/compile.deus). The output is [Core](./CORE.md), which the type checker
([`deus/types.deus`](../../deus/types.deus)), the test and theorem checker ([`deus/check.deus`](../../deus/check.deus)),
the prover ([`deus/prove.deus`](../../deus/prove.deus)) and the kernel read. The builtin types and primitives are
declared in [`deus/builtins.deus`](../../deus/builtins.deus); the standard functions are in
[`deus/prelude.deus`](../../deus/prelude.deus). This page specifies the language closely enough to write an
independent front end that produces the same Core, and therefore the same hashes.

## Source text

A source file is UTF-8 text. The lexer reads it as a sequence of UTF-16 code units (`Text.code`), so a
column is a count of UTF-16 code units from the start of the line. Lines are numbered from 1 and columns
from 0. A tab counts as one column. `\r` is whitespace. There is no version marker; the language is
whatever the current seed accepts ([D18](../DECISIONS.md) adds syntax in two seed builds).

In an `.mdl` document only the ` ```deus ` fences are read, with positions mapped into the
document. See [MDL.md](./MDL.md).

## Lexical structure

Whitespace is space, tab, `\r` and newline. Each token records its line, its column and whether it is
the first token on its line (`bol`). The layout rule (below) uses only `bol` and the column.

### Comments

| Form       | Meaning                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `-- …`     | Line comment, to the end of the line.                                                           |
| `/- … -/`  | Block comment. Block comments nest. An unterminated one runs to the end of the file.            |
| `/-- … -/` | Doc comment: `/--` not followed by `/`. It is a token whose text is the trimmed body. It nests. |

Ordinary comments never reach Core, but they are kept (D66). Comments before a declaration become its
`lead` metadata. Comments before a statement of a block or before a match arm become `notes` on that
node. A comment anywhere else (inside an expression, between a type's constructors, at the end of a file)
goes to the next statement or declaration that takes comments. A blank line between two comments is
kept. Identical definitions share one hash, so they share their comments.

A number literal written other than in decimal (`'"'`, `0x60`, `1_000`) is the same integer in Core,
and its spelling is kept beside it as `spellings` metadata (D84), so `view` and `deus export` print it
as written. Theorems and the TypeScript-like dialect print the decimal value.

A doc comment is only accepted directly before a declaration (and its attributes). Anywhere else the
parser rejects it. A doc comment before `namespace`, `end` or `open` is accepted and dropped.

### Identifiers and keywords

```text
identStart = 'A'..'Z' | 'a'..'z' | '_' | U+0370..U+03FF
identPart  = identStart | '0'..'9' | "'" | '?' | '!'
ident      = identStart { identPart | '.' identStart }
```

A dot followed by an identifier start continues the identifier, so `List.map` and `p.x.y` are one token.
A lone `_` is a symbol, not an identifier. Because `!` and `?` are identifier parts, `a!=b` lexes as the
identifier `a!` followed by `=`; write `a != b`.

Keywords are reserved and cannot be identifiers:

```text
def theorem test inductive structure ability namespace end open match with fun let rec
if then else handle return by sorry where do prim true false
```

The identifier `λ` alone is the keyword `fun`. Since Greek letters are identifier characters, `λx` is
an identifier; write `λ x`.

A token that starts with `.` followed by an identifier start is a **dot name**. Directly after `)` or `]`
it is a projection (`(e).field`); otherwise it is a constructor shorthand (`.red`).

### Literals

| Literal   | Form                                                | Token                                                                        |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Decimal   | `0`–`9` then digits and `_`: `1_000`                | integer                                                                      |
| Hex       | `0x` then hex digits and `_`: `0x1F`, `0xFFFF_FFFF` | integer                                                                      |
| String    | `"…"`; may span lines                               | text                                                                         |
| Character | `'a'`, `'\n'`, `'\''`                               | integer: the UTF-16 code unit of the char; `view` prints it as written (D84) |

There are no negative literals in the lexer; `-` before an integer is handled by the parser. There are no
floating-point literals. An integer literal is reduced to 32 bits: `3000000000` is `-1294967296` and
`0xFFFFFFFF` is `-1` ([D9](../DECISIONS.md)).

Escapes in strings: `\n` (10), `\t` (9), `\r` (13), `\0` (0), `\u{h…}` (hex code), and `\c` for any other
character `c`, which stands for itself (`\"`, `\\`, `\'`). A character literal takes the same escapes
except `\u{}`, and its content must be one UTF-16 code unit.

A `\u{…}` code above U+FFFF becomes its UTF-16 surrogate pair, so `"\u{1F600}"` is `"😀"`, of
length 2 ([D76](../DECISIONS.md)).

### Symbols

The lexer tries a Unicode spelling first, then two characters, then one.

```text
two characters:  :=  =>  ->  <-  ::  ++  ==  !=  <=  >=  &&  ||  |>  <|  @[
one character:   (  )  [  ]  {  }  ,  :  |  @  +  -  *  /  %  <  >  =  !  _  ;
Unicode:         → (->)  ⇒ (=>)  ≠ (!=)  ≤ (<=)  ≥ (>=)  × (*)  ← (<-)
```

`<-` is lexed but no rule uses it. Any other character is an error: `line:col: unexpected character c`.

## Layout

Layout follows Lean's offside rule ([D11](../DECISIONS.md)). The parser keeps one number, the **stop
column**. A token is **offside** when it is the end of file, or when it starts a line at or left of the stop
column. An offside token ends the expression being parsed.

- Every declaration keyword (after its doc comment and attributes) must start a line at column 0. The stop
  column at top level is 0, so any line that starts at column 0 ends the previous declaration.
- A **body** (after `:=`, `=>`, `then`, `else`, `do`, `handle`) that starts on the same line is one
  expression. A body that starts on a new line is a **block**: its first token sets the block column, which
  must be right of the current stop column. The block's statements start at that column, or are separated
  by `;`. A line that starts further right continues the current statement.
- Inside `( … )`, `[ … ]`, `{ … }` and binder brackets the stop column is -1, so layout is free.
- Match and handler arms: if the first `|` starts a line, its column is the arm column. Each further arm is a
  `|` at the start of a line at that column, and each arm body ends at a line that starts at or left of it.
  If the first `|` is inline, the following arms must be inline too.
- A `let` statement must be followed by another statement, on the next line at the block column or after
  `;`: `let y := x; y`.
- `then`, `else` and `with` are matched by keyword, not by position.

```deus
def l (n : Int) : Int :=
  let a := n
  let rec go i := if i == 0 then a else go (i - 1)
  go n
```

## Declarations

```deus
namespace Shapes

/-- A colour, identified across versions by its IRI. -/
inductive Color @"https://example.org/deus/Color" where
  | red
  | green

structure Point where
  x : Int
  y : Int

def sum : List Int -> Int
  | [] => 0
  | x :: xs => x + sum xs

test moves := ({ Point.mk 1 2 with y := 5 }).y == 5

end Shapes
```

| Declaration | What it introduces                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| `def`       | A term. All `def`s of a batch may refer to each other in any order; recursion needs no keyword.                 |
| `test`      | A `Bool` expression run by `deus test`, in a deterministic simulation unless it has `@[integration]`.           |
| `theorem`   | A proposition over typed binders and its evidence (see [Theorems](#theorems-and-tactics)).                      |
| `inductive` | A type `T` and constructors `T.c`, tagged 0, 1, … in written order.                                             |
| `structure` | A type `T`, one constructor `T.mk` (tag 0) with the fields in order, and an accessor term `T.f` per field.      |
| `ability`   | An ability `A` and operations `A.op`, indexed 0, 1, … Every operation needs at least one argument (use `Unit`). |
| `namespace` | Pushes the (possibly dotted) name onto the current namespace.                                                   |
| `end`       | Pops one segment, or as many segments as the optional name on the same line has. The name is not checked.       |
| `open`      | Adds the names on the same line to the opens of the current namespace level.                                    |

A declared name may be dotted: `def List.sum` inside `namespace Ex` is `Ex.List.sum`. A name declared
twice in one batch is the error `duplicate definition`; a name that already exists in the codebase is
replaced (an update).

**Binders.** `def` and `theorem` take binders: a bare name, `(a b : T)`, or `{a : T}`. Implicit `{…}`
binders name type variables and are erased. A binder without a type has an unknown type.

**Constructors.** A constructor's fields are `(x y : T)` groups, bare type atoms (unnamed fields), or a
signature `: A -> B -> T` whose arguments become unnamed fields. A constructor name may be a keyword
(`| true`). Field names are kept in metadata, not in the type's hash.

**Type parameters** are names or `(a b : Type)` groups after the type's name. The kind written after `:`
is ignored. A parameter used inside a field as an ability row is a row parameter ([D55](../DECISIONS.md)):

```deus
structure Box (r : Effect) where
  run : Unit -> {r} Int

def runBox (b : Box {r}) : {r} Int := b.run ()
```

**IRIs.** `@"iri"` after the parameters names the type or ability ([D6](../DECISIONS.md)). Without one the
IRI is `urn:deus:<fully.qualified.Name>`. An IRI that starts with `#` is a builtin identity, and the
kernel knows the type by it (`inductive Bool @"#Bool"`).

**Attributes.** `@[name value…, name value…]` before a declaration attaches attributes. Each value is the
text of one token (a string's content without quotes). Known attributes are `integration` on tests and
`ext "<uri>"` on `.mdl` extension functions. Attributes are stored in the metadata of `def` and `test`;
on `theorem`, `inductive`, `structure` and `ability` they are parsed and dropped. The attribute line must
come before the declaration keyword, which still starts its own line at column 0.

## Types

```text
List.map     : (a -> {e} b) -> List a -> {e} List b
try          : (Unit -> {Throw e | r} a) -> {r} Result e a
```

| Form         | Meaning                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- |
| `T a b`      | A named type applied to arguments.                                                          |
| `a`          | A type variable: a lower-case name that is not a type parameter or a known type.            |
| `A -> B`     | A function. Arrows associate to the right.                                                  |
| `A -> {E} B` | A function whose call may perform the abilities in row `E`.                                 |
| `{E} B`      | `B` computed with row `E`; on a result type it attaches the row to the last binder's arrow. |
| `()`         | `Unit`.                                                                                     |
| `(A, B, C)`  | A tuple: `Pair A (Pair B C)`.                                                               |
| `T {E}`      | A type applied to a row, for a row parameter.                                               |

A row is `{E₁, E₂ | r}`: abilities (the comma is optional), then an optional row variable after `|`. `{}` is
the empty row. A name in a type resolves as a type parameter, then as a type or ability name (with
suffix matching), then, if it starts with a lower-case ASCII letter, as a type variable. Otherwise it is
the error `unknown type`.

## Expressions

| Form                            | Meaning                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `f a b`                         | Application. Arguments are atoms; `if`, `match`, `let` and `handle` need parentheses. |
| `fun x (a, b) => e`, `λ x => e` | A lambda; parameters are patterns.                                                    |
| `fun \| p => e \| q => e`       | A lambda by cases.                                                                    |
| `let p := e` / `let f x := e`   | A local value or function; `let rec f x := e` is recursive and needs a parameter.     |
| `if c then a else b`            | Conditional.                                                                          |
| `match a, b with \| p, q => e`  | Match on one or more values.                                                          |
| `handle e with \| …`            | Handler (see below).                                                                  |
| `do body`                       | A body (usually a block) in expression position.                                      |
| `(a, b)`, `[a, b]`, `()`        | Tuple, list, unit. Lists allow a trailing comma.                                      |
| `{ x := 1, y := 2 }`            | A structure value; the structure is the one whose fields are exactly these.           |
| `{ p with y := 3 }`             | A copy of `p` with fields replaced.                                                   |
| `p.x.y`, `(e).field`            | Field access on a local name, or on a parenthesised expression.                       |
| `.red`                          | A constructor found by suffix.                                                        |
| `(e : T)`                       | An ascription. It is parsed and erased; the checker does not see it.                  |
| `prim "Int.add"`                | A kernel primitive by name.                                                           |
| `-e`, `!e`                      | Negation, Boolean not. `-` followed by an integer literal is a negative literal.      |

`f -1` is `f - 1`: `-` starts an argument only at the start of an operand. There is no method syntax;
`xs.length` with a local `xs` is a field access and fails unless some structure has a field `length`.
A type annotation on a `let` (`let x : T := v`) or a pattern is also parsed and erased.

### Operators

Binary operators use Lean's table. Higher binds tighter. A left-associative operator parses its right side
at precedence + 1, so `a < b < c` is `(a < b) < c`.

| Precedence | Operators                       | Associativity |
| ---------- | ------------------------------- | ------------- |
| 10         | `\|>`                           | left          |
| 10         | `<\|`                           | right         |
| 30         | `\|\|`                          | right         |
| 35         | `&&`                            | right         |
| 50         | `==` `=` `!=` `<` `<=` `>` `>=` | left          |
| 65         | `++` `+` `-`                    | left          |
| 67         | `::`                            | right         |
| 70         | `*` `/` `%`                     | left          |

Unary `-` and `!` bind tighter than any binary operator and looser than application: `-f x` is `-(f x)`.
`->` is not an expression operator; it appears only between the hypotheses of a theorem.

### Handlers

```deus
def try (body : Unit -> {Throw e | r} a) : {r} Result e a :=
  handle body () with
  | return x => Result.ok x
  | throw e -> _ => Result.err e
```

A clause is `| return p => e`, or `| op args -> k => e`. The operation is a name (resolved among ability
operations, with suffix matching) or a dot name. Its argument patterns must match the operation's arity.
`k` names the continuation; `_` discards it. Handlers are deep and the continuation may be called zero,
one or many times ([D7](../DECISIONS.md)).

## Patterns

| Pattern                | Matches                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `_`                    | anything                                                                    |
| `x`                    | anything, binding `x`, unless `x` resolves exactly to a constructor (below) |
| `C p q`, `T.C`, `.C p` | a constructor with exactly its arity of sub-patterns                        |
| `x@p`                  | `p`, also binding the whole value to `x`                                    |
| `0`, `-1`, `"s"`       | an integer or text literal                                                  |
| `true`, `false`, `()`  | the `Bool` and `Unit` constructors                                          |
| `h :: t`, `[a, b]`     | a non-empty list; a list of exactly that length                             |
| `(a, b, c)`            | nested pairs                                                                |
| `(p : T)`              | `p`; the type is erased                                                     |

The rule for a bare identifier is [D16](../DECISIONS.md): it is a constructor only when it resolves
_exactly_ to one through the namespace chain or an `open`, never by suffix. Otherwise it binds a variable.
A dotted name, a dot name or a name with arguments must be a constructor (suffix matching allowed), or it
is the error `unknown constructor`. Because `Option` is always open, `none` and `some x` are its
constructors everywhere.

Matches are not checked for exhaustiveness. A value no case matches is a defect at run time
(`defect: no match for 3`).

## Grammar

EBNF over tokens. `IDENT`, `DOTNAME`, `PROJ`, `INT`, `STRING` and `DOC` are token kinds; quoted strings are
symbols or keywords. Layout (offside tokens, blocks, arm columns) is described above and not repeated here.

```text
file        = { decl } EOF ;
decl        = [ DOC ] [ attrs ] declBody ;              (* declBody starts a line at column 0 *)
attrs       = "@[" { IDENT { TOKEN } [ "," ] } "]" ;    (* TOKEN: any token but "," and "]" *)
declBody    = def | theorem | test | inductive | record | ability
            | "namespace" IDENT | "end" [ IDENT ] | "open" { IDENT } ;
def         = "def" IDENT binders [ ":" type ] ( ":=" body | arms ) ;
theorem     = "theorem" IDENT binders ":" expr { "->" expr } ":=" ( "sorry" | "by" { TOKEN } ) ;
test        = "test" IDENT ":=" body ;
inductive   = "inductive" IDENT typeParams [ iri ] "where" { "|" ( IDENT | KEYWORD ) ctorFields } ;
record      = "structure" IDENT typeParams [ iri ] "where" { field } ;
ability     = "ability" IDENT typeParams [ iri ] "where" { field } ;
field       = IDENT ":" type ;                          (* IDENT starts a line, column > 0 *)
iri         = "@" STRING ;
typeParams  = { IDENT | group } ;
binders     = { IDENT | group } ;
group       = "(" { IDENT } [ ":" type ] ")" | "{" { IDENT } [ ":" type ] "}" ;
ctorFields  = { "(" IDENT { IDENT } ":" type ")" | tyAtom } [ ":" type ] ;

type        = tyApp [ "->" [ row ] type ] ;
tyApp       = IDENT { IDENT | paren | row } | tyAtom ;     (* arguments only after a bare name *)
tyAtom      = IDENT | row tyApp | paren ;
paren       = "(" ")" | "(" type { "," type } ")" ;
row         = "{" { tyApp [ "," ] } [ "|" IDENT ] "}" ;

body        = block | expr ;                            (* block: starts a new line *)
block       = stmt ;
stmt        = "let" [ "rec" ] IDENT { patAtom } [ ":" type ] ":=" body sep stmt
            | "let" pattern [ ":" type ] ":=" body sep stmt
            | expr [ sep stmt ] ;
sep         = ";" | (* a new line at the block column *) ;
expr        = stmt (* when it starts with "let" *) | binary ;
binary      = unary { BINOP unary } ;                   (* precedence table above *)
unary       = "-" INT | "-" unary | "!" unary | app ;
app         = atom { atom } ;
atom        = atomBase { PROJ } ;
atomBase    = IDENT | DOTNAME | INT | STRING | "true" | "false" | "prim" STRING
            | "fun" ( arms | { patAtom } "=>" body )
            | "if" expr "then" body "else" body
            | "match" expr { "," expr } "with" arms
            | "handle" body "with" { "|" clause }
            | "do" body
            | "(" ")" | "(" expr ":" type ")" | "(" expr { "," expr } ")"
            | "[" { expr "," } [ expr ] "]"
            | "{" [ expr "with" ] { IDENT ":=" expr "," } [ IDENT ":=" expr ] "}" ;
arms        = arm { arm } ;
arm         = "|" pattern { "," pattern } "=>" body ;
clause      = "return" pattern "=>" body
            | ( IDENT | DOTNAME ) { patAtom } "->" ( IDENT | "_" ) "=>" body ;

pattern     = patApp [ "::" pattern ] ;
patApp      = ( IDENT | DOTNAME ) { patAtom } | patAtom ;
patAtom     = IDENT [ "@" patAtom ] | DOTNAME | INT | "-" INT | STRING | "true" | "false" | "_"
            | "(" ")" | "(" pattern [ ":" type ] { "," pattern } ")"
            | "[" { pattern "," } [ pattern ] "]" ;
```

## Name resolution

Each file starts in the root namespace with `Option` open. `namespace` opens a new level of opens and `end`
closes it, so an `open` lasts until the `end` of the namespace it is written in, or the end of the file.
Nothing carries from one file to the next.

A definition's body resolves in the namespace given by its fully qualified name minus the last segment
(Lean's rule), so `def List.sum` in `namespace Ex` resolves in `Ex.List`. A name `n` is looked up in this
order ([`Names.lookup`](../../deus/resolve.deus)):

1. Locals, innermost first. A dotted name whose first segment is a local is field access on it.
2. The namespace chain, innermost first: `Ex.List.n`, `Ex.n`, `n`.
3. The opens, outermost level first (so `Option` before any file-level `open`): `o.n`.
4. Suffix matching, as in Unison: the unique fully qualified name that equals `n` or ends in `.n`. Two or
   more candidates are the error `ambiguous name n: a, b`.

Each lookup accepts only the kinds it wants: values (terms, constructors, operations), types and abilities,
constructors, operations, or theorems (lemmas in proofs). Tests and theorems are not values. Bare
constructor patterns skip step 4 (D16). Library code mounted under `lib.<name>` is found by suffix.

A field name in `p.x`, `(e).x` or a record expression is resolved by the field alone: the structure is the
unique one that declares that field (`unknown field`, `ambiguous field`). A record literal without `with`
must give every field; values are evaluated in the structure's field order.

## Lowering to Core

The resolver writes Core with binder names, then `Resolve.strip` removes them into metadata
(`(meta (locals …))`) before hashing, so renaming a local never changes a hash. A reference to a definition
in the same batch is a placeholder until the batch is hashed in dependency order, a recursive group as one
`cycle` ([D5](../DECISIONS.md)). The Core forms are specified in [CORE.md](./CORE.md); stored objects are in
[CODEBASE-STORE.md](./CODEBASE-STORE.md).

| Surface                       | Core                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `def f x y := e`              | `(term (lam (lam e)))`                                                               |
| `def f : A -> B \| p => e …`  | one `lam` per pattern column, then `match` on `(var 0)` or on a tuple of the columns |
| `test t := e`                 | `(test e)`                                                                           |
| local name, global name       | `(var i)` (de Bruijn), `(ref "hash")`                                                |
| constructor, operation        | `(con "T" tag arity)`, `(op "A" index arity)`                                        |
| `42`, `"s"`, `()`, `true`     | `(int 42)`, `(text "s")`, `(con "#Unit" 0 0)`, `(con "#Bool" 1 0)`                   |
| `(a, b, c)`                   | `(app (con "#Pair" 0 2) a (app (con "#Pair" 0 2) b c))`                              |
| `[a, b]`, `h :: t`            | nested `(con "#List" 1 2)` ending in `(con "#List" 0 0)`                             |
| `a + b`, `a == b`, `xs ++ ys` | `(app (prim "Int.add") a b)`, `(prim "eq")`, `(prim "append")`; see the list below   |
| `a && b`, `a \|\| b`, `!a`    | `(if a b false)`, `(if a true b)`, `(if a false true)`                               |
| `x \|> f`, `f <\| x`          | `(app f x)`, with nested applications flattened                                      |
| `-e`                          | `(app (prim "Int.neg") e)`                                                           |
| `fun x => e`                  | `(lam e)`; a non-variable parameter becomes `(lam (match (var 0) (case p e)))`       |
| `let x := v` / `let _ := v`   | `(let v body)` / `(seq v body)`; other patterns become `match`                       |
| `let rec f x := v`            | `(letrec ((lam v)) body)`                                                            |
| `e₁` newline `e₂`             | `(seq e₁ e₂)`                                                                        |
| `match a, b with …`           | `(match (pair a b) (case (pair-pattern) e) …)`                                       |
| `handle e with …`             | `(handle e (ret r) (on "A" index arity h) …)`; `h` binds the arguments, then `k`     |
| `p.x`, `(e).x`                | `(app (ref "<accessor>") p)`                                                         |
| `{ x := 1, y := 2 }`          | `(app (con "<hash>" 0 2) …)` in field order                                          |
| `{ p with y := 3 }`           | `match` on `p` with a pattern of `(pvar)`s, then the constructor applied             |
| `(e : T)`                     | `e`                                                                                  |

In the table, `true` and `false` stand for `(con "#Bool" 1 0)` and `(con "#Bool" 0 0)`. Operators map to
primitives: `+ - * / %` to `Int.add`, `Int.sub`, `Int.mul`, `Int.div`, `Int.mod`;
`==` and `=` to `eq`; `!=` `<` `<=` `>` `>=` to `neq`, `lt`, `le`, `gt`, `ge`; `++` to `append`; and `->` in
a theorem to `implies`. A structure accessor is the term `(lam (match (var 0) (case (pcon "<hash>" 0 (pvar)…) (var i))))`.

Real output of `deus view --core` for `def len : List a -> Int | [] => 0 | _ :: rest => 1 + len rest`:

```text
(term (lam (match (var 0) (case (pcon "#List" 0) (int 0)) (case (pcon "#List" 1 (pany) (pvar)) (app (prim "Int.add") (int 1) (app (ref "b316c30db72b…") (var 0)))))))
```

Type declarations become `(type "iri" params (ctor arity field-type …) …)` and abilities become
`(ability "iri" params (op arity type) …)`, with field types naming other types by IRI. A builtin (`#…`)
IRI is its own hash; any other type is named by the SHA-256 of that form.

## Static semantics

The checker is Hindley–Milner with Koka-style ability rows, run over Core ([D28](../DECISIONS.md),
[D36](../DECISIONS.md)):

- Top-level definitions are generalized; `let` bindings are monomorphic. A strongly connected group of
  definitions is inferred together. A member with a signature is used at its signature inside the group
  (polymorphic recursion, D30).
- A signature is checked, not just unified: its type variables must stay distinct and general, and its
  named row variables are rigid (`type variable a is declared general but must be Int`).
- A `test` must have type `Bool`. A theorem's proposition is checked like a `def` over its binders.
- Every arrow carries a row. In a signature, an arrow written without braces has a fresh row and constrains
  nothing; a written row is closed, and `{E | r}` names the rest. `{}` declares a pure function.
- A call needs the callee's row **contained** in the context's row (subsumption), not equal. Plain arguments
  are checked first, then the callee's rows are linked to the context, then lambda arguments are checked
  against the parameter types, so a callback runs in its caller's row.
- A row holds one instance of each ability IRI. Row unification applies Leijen's side condition: a label
  missing from a row that shares the other row's tail is a mismatch.
- A handler adds the abilities it handles to its body's row and removes them from what flows out. A
  `throw` that nothing handles reaches the signature: `unhandled ability Throw Text`.
- Constructor fields are closed: a field arrow written without braces is pure, and a row parameter passes
  the row in braces (`Box {IO | r}`), so a stored function keeps its effects ([D55](../DECISIONS.md)).
- Equality and ordering (`==`, `<`, `compare`) are structural primitives at any type
  ([D10](../DECISIONS.md)). There are no type classes.

Inferred types are stored as `(scheme …)` metadata. `DEUS_TYPECHECK=warn` reports type errors as warnings
and `DEUS_TYPECHECK=0` skips checking (only for bootstrapping the checker).

Note: a row written on a definition with no binders (`def x : {} Int := throw "x"`) is not checked, because
the row is only attached to a binder's arrow.

## Dynamic semantics

- Evaluation is strict (call by value). Arguments, tuple items and list items are evaluated left to right.
- `Int` is a 32-bit two's-complement integer that wraps on every backend ([D9](../DECISIONS.md)). `/`
  truncates toward zero (`7 / -2` is `-3`) and `%` takes the sign of the dividend (`-7 % 3` is `-1`).
- `Text` is a sequence of UTF-16 code units: `Text.length "😀"` is 2.
- `==` is structural equality; functions are never equal. `compare` is a structural order.
- Handlers are deep and multi-shot. `Ref` and `MutMap` writes are not undone when a continuation is resumed
  twice ([D15](../DECISIONS.md)). An `IO` request that no handler catches goes to the host.
- Failure has three tiers ([D14](../DECISIONS.md)):

| Tier   | Cause                                        | Behaviour                                                            |
| ------ | -------------------------------------------- | -------------------------------------------------------------------- |
| Error  | `throw e` (ability `Throw e`)                | Checked in the row; handled with `try`, `catch` or any handler.      |
| Defect | failed match, division by zero, `defect "…"` | `Defect.raise`; a boundary may observe it, never resume it; exit 70. |
| Panic  | a kernel invariant fails                     | Not catchable; exit 71.                                              |

## Theorems and tactics

```deus
theorem sum_append (xs ys : List Int) : sum (xs ++ ys) = sum xs + sum ys := by test 200

theorem isortSorted (xs : List Int) : sorted (isort xs) = true := by
  induction xs; simp [insertSorted]
```

A theorem is `theorem name binders : P₁ -> … -> Q := evidence`. The statement is a `Bool` expression;
hypotheses are folded right to left into `implies`. The evidence is `sorry` or `by` followed by every token
up to the next line that starts at column 0. The object is `(theorem (binders type …) prop (proof token …))`;
the tokens are kept as text, and each name inside `[ … ]` is resolved to a theorem's hash, so changing a
lemma changes the theorem's hash.

Four proofs are recognized only as the whole token list ([D13](../DECISIONS.md)):

| Evidence    | Verdict                                                               |
| ----------- | --------------------------------------------------------------------- |
| `sorry`     | unchecked                                                             |
| `by test n` | `tested, n cases` (`n` defaults to 100); seeded by the theorem's hash |
| `by decide` | proved; every value of finite binder types is checked                 |
| `by rfl`    | proved; needs no binders, the statement evaluates to `true`           |

Anything else is a tactic script for the prover ([D21](../DECISIONS.md)). Steps are separated by `;` (or
`<;>`, which lexes as `<`, `;`, `>`) and each applies to every open goal. A step is a tactic name, its
arguments, and lemmas in `[ … ]`.

| Tactic        | Effect                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| `intro`       | Moves `P ->` hypotheses into the context (also done by `simp`).          |
| `induction x` | Structural induction on binder `x`, with induction hypotheses.           |
| `cases x`     | Case analysis on binder `x`.                                             |
| `simp [l, …]` | Evaluates and rewrites with hypotheses and the lemmas, in written order. |
| `split`       | Splits on the first undecided `if` condition.                            |
| `auto [l, …]` | `simp`, then `split` or `cases` on a stuck variable, to depth 8.         |
| `trace`       | Prints the open goals to stderr.                                         |

A script that closes every goal gives the verdict `proof`, or `proof assuming tested lemmas` when a lemma
is only tested. A lemma that fails fails the theorem. The trusted base is written at the top of
[`deus/prove.deus`](../../deus/prove.deus).

A step whose name is not one of `simp`, `intro`, `split`, `auto`, `induction`, `cases` and `trace` fails
the theorem with `unknown tactic <name>` ([D71](../DECISIONS.md)), so a misspelled step cannot pass
silently. `rfl` and `decide` are whole proofs, so inside a script they fail the same way.

Note: the editor grammar highlights tactics the prover does not have (`exact`, `rw`, `apply`, `unfold`,
`constructor`, `trivial`, `all_goals`). The prover also
skips a `·` token, but the lexer rejects `·`.

## Errors

Lexer and parser errors are checked errors (`Throw Text`) with a position, never defects
([D34](../DECISIONS.md)): `path:line:col: message`, and parser errors add the token, as in
`t.deus:3:2: declarations start at column 0 (at ident "x")`. Resolution errors name the definition:
`t.deus: p2:1:37: unknown name a!`. Type errors name the definition and the callee:
`p4: unhandled ability Throw Text (calling an ability operation)`.
