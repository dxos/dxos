# MDL documents in DEUS

An `.mdl` file is a Markdown document with typed blocks. DEUS reads two things from it: DEUS code in
` ```deus ` fences, which `deus add` compiles like a `.deus` file, and typed blocks in ` ```mdl `
fences, which `deus mdl` checks by running each block through an extension written in DEUS.
Identified blocks are also stored in the codebase as spec objects, so a codebase can be checked
without its documents. People and agents write `.mdl` files; `deus add`, `deus update` and
`deus mdl` read them. The implementation is [`deus/mdl.deus`](../../deus/mdl.deus) (parser, block
data, `MdlHost`, spec objects), [`deus/cli.deus`](../../deus/cli.deus) (`specEntries`, `withHost`,
`extensions`, `checkBlock`, `mdl`), [`platform/perf.deus`](../../platform/perf.deus) (the `perf`
extension) and [`examples/perf.mdl`](../../examples/perf.mdl). Decisions: [D46](../DECISIONS.md)
(extensions), [D48](../DECISIONS.md) (spec objects).

This spec covers the subset of MDL that DEUS parses. Markdown outside fences, frontmatter and the
Extensions table is ignored. Lines are split on `\n`; most rules trim each line first.

## Document structure

````text
document     = [ frontmatter ] { line }
frontmatter  = "---" NL { key-value NL } "---" NL       ; must be the first line
heading      = "#"… text                                ; sets the current section
fence        = "```" info NL { line NL } "```"          ; opening and closing lines are trimmed
mdl-fence    = "```mdl" NL block-lines "```"
deus-fence   = "```deus" NL source-lines "```"
````

- Frontmatter starts when the first line, trimmed, is `---`, and ends at the next line that trims
  to `---`. Without a closing line there is no frontmatter. Its lines are read as `key: value`
  pairs (see [Block body](#block-body)); others are dropped. DEUS uses only `name`.
- A fence opens on any line that, trimmed, starts with three backticks. It is an MDL fence only
  when the trimmed line is exactly ` ```mdl `. It closes at the next line that trims to exactly
  three backticks. Fences do not nest, and headings inside a fence are text.
- A heading is a line outside a fence that starts with `#`. The section name is the line with its
  leading `#` characters removed and trimmed. Heading level does not matter.

## DEUS code in fences

For compiling, the document is turned into source by blanking every line outside ` ```deus `
fences, and the fence lines themselves, to the empty string. The line count stays the same, so
compiler positions point into the document. Here the fence lines MUST trim to exactly ` ```deus `
and three backticks. The result goes to the compiler as one source file
([LANGUAGE.md](LANGUAGE.md)).

## Extensions table

The Extensions table maps a block type (a term) to the URI of the extension that checks it.

```markdown
## Extensions

| Term   | URI                      |
| ------ | ------------------------ |
| `perf` | `org.dxos.deus.perf@1.0` |
```

- Rows count only in the section whose heading is exactly `Extensions`, up to the next heading.
- A row is a line starting with `|`. Split it on `|` and trim each cell. The row counts when the
  first cell is empty and the second cell starts with a backtick. So the header row and the
  separator row are skipped.
- Term and URI are the second and third cells, each with one surrounding pair of backticks
  removed when present.

A document can also declare a term with an `ext` block:

````markdown
```mdl
ext note
  uri: org.example.note@1.0
```
````

The declared terms are the table rows in document order, then the `ext` blocks that have a `uri`.
Lookup takes the first match. `ext` blocks are declarations: they are never checked and never
stored.

## Blocks

Each ` ```mdl ` fence holds one block. Blank lines are dropped; the first remaining line is the
header; the rest is the body.

```text
header = type [ " " id ] [ ":" title ]
```

- The header splits at its first `:`. The text after it, trimmed, is the title.
- The text before it is split on spaces. The first word is the type, the second the id. Further
  words are ignored. An id cannot contain `:` or a space.
- A block with no id is anonymous. It is checked but not stored.
- The block's line number is the line after the opening fence (1-based, counting frontmatter).

### Block body

Each body line is trimmed, then:

| Line                                                     | Effect                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| empty, or starts with `#`                                | skipped (a comment)                                         |
| starts with `- `                                         | continuation: the rest of the line is added to the last key |
| `key: value`, key made of letters, digits, `-`, `_`, `?` | a new property                                              |
| anything else                                            | continuation                                                |

- A key is the text before the first `:`, trimmed. It must be non-empty. A bare `key:` has the
  empty value.
- In the value, everything from the first `#` (space, hash, space) on is a comment and is
  dropped; the rest is trimmed. A value cannot contain `#`.
- A continuation adds to the last property: it replaces an empty value, otherwise it is appended
  after `\n`. A continuation before any property creates the property `prose`.
- Properties keep document order. Keys may repeat; consumers look up the first.

Example from the parser tests:

```text
perf P-1: fast enough           ->  type "perf", id "P-1", title "fast enough"
  Prose first.                  ->  ("prose", "Prose first.")
  run: f 1  # a comment         ->  ("run", "f 1")
  sizes:                        ->  ("sizes", "1\n2")
  - 1
  - 2
```

### Core rules

`deus mdl <file>` first applies two rules of its own. Each broken rule is one problem on the
document:

- Every block type other than `ext` is a declared term:
  `line <n>: block type \`<type>\` is not in the Extensions table`.
- Block ids are unique in the document, `ext` blocks included: `block id <id> is declared twice`.

`deus add` does not apply these rules.

## Block data

A block reaches an extension as this DEUS structure:

```deus
structure Block @"urn:deus:mdl:Block" where
  blockType : Text
  blockId : Text            -- "" when anonymous
  blockTitle : Text         -- "" when absent
  props : List (Text, Text) -- document order
  lineNo : Int              -- 0 for a block read from a spec object
```

The type's IRI (`urn:deus:mdl:Block`) names it independently of its hash ([LANGUAGE.md](LANGUAGE.md)).

## Extensions

An extension is a DEUS term of type `Block -> {MdlHost} List Text`, with the attribute
`@[ext "<uri>"]`:

```deus
@[ext "org.dxos.deus.perf@1.0"]
def check (b : Block) : {MdlHost} List Text := …
```

The empty list means the block holds. Each text is one problem. The attribute is kept in the term's
metadata as `(attrs ("ext" "<uri>"))`. Real metadata of `Perf.check`, shortened:

```text
(meta (sig (tfun (tref "urn:deus:mdl:Block") (tapp (tref "#List") (tref "#Text")) (eff (tref "urn:deus:mdl:Host"))))
      (doc "The `perf` block type.") … (attrs ("ext" "org.dxos.deus.perf@1.0")) …)
```

The URI is an opaque string compared exactly. By convention it is `<reverse-domain>.<name>@<version>`.

### Finding an extension

`deus mdl` builds a map from URI to term hash over every term the current branch names whose
metadata has an `("ext" "<uri>")` attribute. Two terms with the same URI are not reported; which one
is used is not specified. For each block:

1. Find the URI: the block type's declared term (document), or the URI stored in the spec object.
2. Find the term with that URI in the map.
3. If there is none, the block is `unchecked`. That is not a failure.
4. Otherwise load the term, apply it to the block under a `MdlHost` handler, and catch defects.

| Outcome     | When                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `ok`        | the extension returned `[]`                                                |
| `gap`       | every problem it returned starts with `gap: `: a known gap, reported as is |
| `fail`      | it returned other problems, or raised a defect (`defect: <message>`)       |
| `unchecked` | no URI, or no term in the codebase has it                                  |

`deus mdl` exits with status 1 when any block fails; a gap does not fail. The summary line adds
`, <n> known gaps` when there are any. The extension's type is not checked when it
is run; a term with the attribute but a different type fails at run time. The `--json` output is
described in [CLI-JSON.md](CLI-JSON.md).

### MdlHost

```deus
ability MdlHost @"urn:deus:mdl:Host" where
  cost : Text -> Result Text Int
  holds : Text -> Result Text Bool
  run : Text -> Result Text Text
  describe : Text -> Result Text (List (Text, Text))
```

`cost`, `holds` and `run` take DEUS expression source and compile it against the current branch's
namespace as `def it := <source>`, the way `deus eval` does. `describe` takes a name. A compile
error, a name the namespace lacks, or a defect is `Result.err` with its message.

| Op              | Meaning                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `cost src`      | compiles `fun (u : Unit) => src` and returns the machine steps `Code.cost` counts to apply it to `()` |
| `holds src`     | compiles and evaluates `src`; the value is returned as is                                             |
| `run src`       | compiles and evaluates `src`, a `Text` expression                                                     |
| `describe name` | what the codebase knows about `name`, as properties (below)                                           |

`describe` returns, in this order and only when they apply:

| Property      | Value                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `kind`        | the entry's kind: `term`, `type`, `ability`, `test`, `theorem`, `spec`, `ctor` or `op`                 |
| `hash`        | its hash                                                                                               |
| `view`        | its declaration as `deus view` prints it, without the header lines                                     |
| `type`        | its inferred type as `deus view` displays it (`Text -> Sexp -> {IO} Text`)                             |
| `statement`   | a theorem's binders and proposition with every reference by its full name                              |
| `implemented` | `false` for a term declared with a signature and no body (D93)                                         |
| `verdict`     | `pass`, `fail` or `unchecked`, for a test or a theorem: the cached result, else checked now and cached |
| `evidence`    | with `pass`: `test`, `integration`, `rfl`, `decide`, `proof` or `proof assuming tested lemmas`         |
| `cases`       | with `pass`: how many cases ran                                                                        |
| `reason`      | with `fail`: why                                                                                       |

`Code.cost` runs the thunk on the machine with the JIT off, so steps are deterministic and equal on
both kernels ([D46](../DECISIONS.md)). An operation the thunk performs and does not handle itself is
a defect (`Code.cost: the measured function performs an operation it does not handle`). Note:
`holds` does not check that `src` has type `Bool`.

Other built-in extensions: `requirement` (`org.dxos.deus.requirement@1.0`) and `container`
(`org.dxos.deus.container@1.0`) in [`deus/external.deus`](../../deus/external.deus). They follow the
same contract and are not described here.

## The `req`, `api` and `law` extensions

The [`Spec`](https://deus.dmytro-a80.workers.dev/#n:Spec) namespace in the codebase checks a spec written in the order of the process
(D92): requirements, then the APIs and laws they rest on, then tests and theorems. A spec document
keeps its laws in ` ```deus ` fences, so `deus add` compiles them next to the code they are about.
[Codebase.Spec](https://deus.dmytro-a80.workers.dev/#n:Codebase.Spec) is a full example.

| Term  | URI                     | Term            | Properties                         |
| ----- | ----------------------- | --------------- | ---------------------------------- |
| `req` | `org.dxos.deus.req@1.0` | `Spec.checkReq` | `by`, `gap`                        |
| `api` | `org.dxos.deus.api@1.0` | `Spec.checkApi` | `signatures`                       |
| `law` | `org.dxos.deus.law@1.0` | `Spec.checkLaw` | `theorem`, `statement`, `evidence` |

- `req`: `by` names tests or theorems, separated by `|` or one per `- ` line; each must pass. A
  `req` with no `by` must say in `gap` what will add its evidence; it is then the outcome `gap`.
  With neither, the problem is `no evidence: …`.
- `api`: `signatures` holds one `Name : Type` per line. The name must be in the codebase, and its
  `describe` type must equal the stated one after runs of spaces and new lines are collapsed. A
  line with no `:` only checks that the name exists. A name declared without a body (D93) is
  reported as the gap `<name> is declared but not implemented`.
- `law`: `theorem` names one theorem. It must pass, and with `evidence: proof` its evidence must be
  `proof`, `decide` or `rfl` (the default, `test`, accepts any pass). `statement`, when given, must
  equal the theorem's `describe` statement, with `=` read as `==` and spaces collapsed.

## The `perf` extension

URI `org.dxos.deus.perf@1.0`, term `Perf.check`. A `perf` block is a performance requirement in
machine steps.

| Property | Required | Meaning                                                                 |
| -------- | -------- | ----------------------------------------------------------------------- |
| `run`    | yes      | an expression; with `sizes`, a function from a size (`Int`) to the work |
| `sizes`  | no       | integers separated by `\|`, e.g. `20 \| 40 \| 80`                       |
| `order`  | no       | one of `1`, `log n`, `n`, `n log n`, `n^2` (exact text)                 |
| `budget` | no       | the most steps allowed                                                  |

```mdl
perf P-1: insertion sort is quadratic on reversed input
  run: fun n => Sort.isort (List.reverse (List.range 0 n))
  sizes: 20 | 40 | 80
  order: n^2
  budget: 100000
```

Semantics:

- No `run`: the problem `perf needs run:`.
- Without `sizes`: `cost run`. A `budget` fails when steps exceed it.
- With `sizes`: each size is trimmed and parsed as an integer, else the problem
  `sizes: <text> is not a list of numbers like 10 | 20 | 40`. For each size `n` in the given order,
  the host measures `cost "(" ++ run ++ ") " ++ n`. Any `err` results are the problems.
- `order`: for each consecutive pair of samples `(n1, c1)`, `(n2, c2)`, with integer arithmetic:
  `observed = c2 * 100 / max(c1, 1)` and `allowed = g(n2) * 125 / g(n1)`, where `g` is the order's
  growth function. The pair fails when `observed > allowed`. So cost may grow by the order's ratio
  plus 25%.
- `budget` applies to the last sample (the last listed size). Sizes are expected in increasing
  order but this is not checked.

| `order`   | `g(n)`        |
| --------- | ------------- |
| `1`       | `1`           |
| `log n`   | `log2(n)`     |
| `n`       | `n`           |
| `n log n` | `n * log2(n)` |
| `n^2`     | `n * n`       |

`log2(n)` is `1` for `n <= 2`, else `1 + log2(n / 2)` with integer division. Problem texts, from a
real run:

```text
fail      bad.mdl:11 perf B-1
          cost grew x3.72 from n=20 to n=40 (1378 -> 5138 steps); order n allows x2.50
          took 5138 steps; the budget is 1000
```

Ratios print as hundredths, `x<int>.<two digits>`. Other problems: `budget: <text> is not a number
of steps` and `order: <text> is not one of 1, log n, n, n log n, n^2`.

## Spec objects

`deus add` and `deus update` store every identified, non-`ext` block of an `.mdl` file as a spec
object ([D48](../DECISIONS.md)):

```text
spec-object = "(spec" " " type " " uri " " id " " title { " (" key " " value ")" } ")"
              ; every field is a string; props in document order
```

`uri` is the URI the document declares for the block's type, or `""` if it declares none. The line
number is left out, so moving a block does not change its hash. The object is stored like any other
under the SHA-256 of its canonical text ([CODEBASE-STORE.md](CODEBASE-STORE.md)); its layer is
`spec`, and a spec may depend only on specs.

The block is named `<document>.<id>`. The document name is the frontmatter `name`, else the file's
base name up to its first `.`. The namespace entry is `(spec "<hash>")`. Real sample from
`examples/perf.mdl` (frontmatter `name: Sort.Perf`):

```text
(n "Sort.Perf.P-1" (spec "7298829d73ad461e3897df77d907fba2f2c54ac76d63ddf1e64a3ddc9ba292e3"))

(spec "perf" "org.dxos.deus.perf@1.0" "P-1" "insertion sort is quadratic on reversed input"
  ("run" "fun n => Sort.isort (List.reverse (List.range 0 n))") ("sizes" "20 | 40 | 80")
  ("order" "n^2") ("budget" "100000"))
```

(The stored object is one line; it is wrapped here.)

Reading a spec object back gives the URI and a `Block` with `lineNo` 0. Items after the title that
are not two-element lists are ignored. A form with fewer than four arguments reads as an empty
block with URI `""`. `deus mdl` with no files checks every spec the current branch names, by its
stored URI, and reports it under its name. `deus view` prints a spec back as an ` ```mdl ` block: a
property whose value has newlines prints as `- ` lines.

## Spec documents in the codebase

A spec document lives in the codebase, not as a file ([D99](../DECISIONS.md)). Its blocks are spec
objects as above; its prose is kept in each block's metadata, which is not hashed, so editing prose
never changes a block's hash:

| Field      | On              | Value                                                                  |
| ---------- | --------------- | ---------------------------------------------------------------------- |
| `document` | every block     | the document name                                                      |
| `order`    | every block     | the block's index among the document's stored blocks                   |
| `lead`     | every block     | the text between the previous stored block (or the start) and this one |
| `front`    | the first block | the frontmatter, as `("key" "value")` pairs                            |
| `tail`     | the last block  | the text after the last stored block, when there is any                |

The prose leaves out three things. A ` ```deus ` fence is dropped, since `deus add` stores its code
as definitions; a fence whose first line is `namespace N` leaves the line ``The laws are the
definitions under `N`: …``. The Extensions table's rows are dropped, since the export writes the
table from the blocks' URIs under the document's `## Extensions` heading (or at the top when the
document has none). Runs of blank lines outside fences become one blank line. Everything else stays
as written, ` ```ext ` blocks and other fences included.

| Command                  | What it does                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `deus view <Document>`   | prints the whole document: frontmatter, Extensions table, then each block after its prose |
| `deus mdl <Document>`    | checks the document's blocks from the codebase, in document order                         |
| `deus mdl`               | checks every spec document the codebase holds                                             |
| `deus update <file.mdl>` | stores a document's blocks and prose; a block removed from the file stays until `deus rm` |
| `deus export <dir>`      | writes each document to `specs/<Document>.mdl`, as `deus view` prints it                  |

Exporting, then restoring with `deus add code specs`, gives back the same documents byte for byte.
Metadata replicates like other metadata: a pull keeps a block's existing metadata, so prose edited on
two codebases does not merge.
