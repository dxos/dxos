# Codebase replication format

A remote holds a codebase as a set of immutable bundles. A bundle is one S-expression that carries
objects, their metadata and branch claims. It is encoded as columnar text (DEUSCOL1) and stored gzip
compressed. `deus push`, `deus pull` and `deus compact` write and read bundles. Any client that
reads this format can replicate a codebase without a server. The implementation is in
[`deus/replicate.deus`](../../deus/replicate.deus) (bundles, remotes, heads, compaction, GC),
[`deus/columnar.deus`](../../deus/columnar.deus) (the DEUSCOL1 encoding) and
[`deus/cli.deus`](../../deus/cli.deus) (`withRemote`, the commands). Decisions:
[D50](../DECISIONS.md) (bundles, heads, sedimentree), [D72](../DECISIONS.md) (no history is
trimmed), [D60](../DECISIONS.md) and [D73](../DECISIONS.md) (columnar
text, gzip).

Objects and their hashes are defined in [CODEBASE-STORE.md](CODEBASE-STORE.md). The canonical
S-expression text that both hashes and dictionaries use is defined in [CORE.md](CORE.md).

## Bundle names

```text
name   = level "-" sha256
level  = decimal integer, no sign, no leading zeros   ; 0 push, k >= 1 compaction
sha256 = 64 lowercase hex digits
```

The hash is SHA-256 over the UTF-8 bytes of the bundle text before compression: the DEUSCOL1 text
of [Columnar encoding](#columnar-encoding-deuscol1), with no trailing newline. The gzip bytes are not
hashed. A writer MUST name a bundle this way, because equal content then gives equal names and
concurrent writers never conflict.

The level is the text before the first `-`. The implementation reads a name whose prefix is not an
integer as level 0. It does not check the hash of a bundle it reads.

Real sample: `0-a86b65c302098f3ddcb8dc11e7b496bce75bb2b7231a9267724f9d293808340f`.

## Bundle contents

Before encoding, a bundle is exactly one form:

```text
bundle = "(bundle" { " " claim } { " " obj } { " " meta } ")"
claim  = "(branch " string " " string ")"     ; branch name, causal node hash
obj    = "(obj " string " " form ")"          ; object hash, the object's form
meta   = "(meta " string " " form ")"         ; object hash, the object's metadata form
```

| Item     | Meaning                                                                                 |
| -------- | --------------------------------------------------------------------------------------- |
| `branch` | a claim that the branch's head is (or descends from) this causal node                   |
| `obj`    | an object of the store: `form` is what `objects/<hh>/<hash>` holds, parsed              |
| `meta`   | metadata for an object: `form` is what `meta/<hash>` holds, parsed (`(meta (sig …) …)`) |

Rules for a writer, all needed for byte-identical bundles across clients:

- Claims are sorted (by branch, then causal hash, as text) and deduplicated.
- The object hashes are sorted as text and deduplicated. `obj` items come in that order, then `meta`
  items in the same order.
- An `obj` item is present only when the store has the object; a `meta` item only when the store
  has metadata for it.
- `form` is the object as parsed from its canonical text, so the object's hash is the SHA-256 of
  the printed `form` ([CORE.md](CORE.md)).

A bundle can hold claims only (no objects), objects only (compaction strata), or both (push, GC).

A reader takes the arguments of the single top-level form. It ignores items whose shape it does not
know. For `obj` it writes the object unless the store already has that hash. For `meta` it writes
the metadata only when the store has none for that hash, so the first metadata seen wins. The
implementation does not check that `sha256(print(form))` equals the claimed hash; an independent
reader SHOULD check it.

Only `objects/` and `meta/` travel in bundles. Note: `deus layers` reports the `results` and
`provenance` layers as replicated, but no bundle carries them (`Codebase.layers` in
[`deus/codebase.deus`](../../deus/codebase.deus) disagrees with `Replicate.bundle`).

## Columnar encoding (DEUSCOL1)

The bundle form is written as nine lines joined by `\n` (0x0A), with no trailing newline:

```text
line 1  magic          "DEUSCOL1"
line 2  shape          one character per token
line 3  symbols        dictionary: canonical list of strings
line 4  strings        dictionary: canonical list of strings
line 5  hashes         dictionary: 64-hex-digit values, concatenated with no separator
line 6  symbol refs    space-separated decimal integers
line 7  string refs    space-separated decimal integers
line 8  hash refs      space-separated decimal integers
line 9  integers       space-separated decimal integers
```

The encoder takes a list of forms. A bundle is always a list of one form.

### Shape alphabet

The encoder walks each form depth first, left to right, and writes one character per token:

| Char | Token                     | Value comes from                                |
| ---- | ------------------------- | ----------------------------------------------- |
| `(`  | start of a list           |                                                 |
| `)`  | end of a list             |                                                 |
| `s`  | symbol                    | next symbol ref, an index into the symbols line |
| `t`  | string that is not a hash | next string ref, an index into the strings line |
| `h`  | string that is a hash     | next hash ref, an index into the hashes line    |
| `i`  | integer                   | next value of the integers line                 |

A string is a hash when it is exactly 64 characters, each `0`–`9` or `a`–`f`. Any such string goes
to the hash column, whatever it means. Uppercase hex is an ordinary string.

### Dictionaries and first-use numbering

Each dictionary is numbered from 0 in order of first use during the walk. A value seen again reuses
its first index. This makes the encoding deterministic: the same forms always give the same text.

- Symbols and strings lines are one canonical S-expression list of strings: `("bundle" "branch")`.
  Symbol names are written as strings. Escapes follow [CORE.md](CORE.md) (`\"`, `\\`, `\n`, `\t`,
  `\r`, `\uXXXX`), so no dictionary line contains a newline. An empty dictionary is `()`.
- The hashes line is the hashes in index order, concatenated. Hash `k` is the characters
  `64k` to `64k+63`. An empty dictionary is the empty line.

### Reference lines

Lines 6 to 9 hold one number per `s`, `t`, `h` and `i` token, in walk order, as decimal text
separated by single spaces. A line with no values is empty. Integers are the integer's own value:
optional `-`, then decimal digits (32-bit, as in [CORE.md](CORE.md)). There is no other integer
encoding.

### Decode algorithm

1. Split the text on `\n`. There MUST be exactly 9 lines; otherwise the bundle is malformed.
2. Parse lines 3 and 4 as S-expression lists of strings. Parse lines 6 to 9 as integers, skipping
   empty items.
3. Keep a stack of open lists and a list of finished top-level forms. For each shape character:
   - `(`: push an empty list.
   - `)`: pop the top list; it is malformed if the stack is empty. Add the finished list to the new
     top, or to the top-level forms if the stack is now empty.
   - `s`, `t`: take the next ref from its line and look it up in its dictionary.
   - `h`: take the next ref `k` and slice the hashes line at `[64k, 64k+64)`.
   - `i`: take the next integer.
   - Add the atom to the top list, or to the top-level forms.
4. At the end the stack MUST be empty. A ref line that runs out early is malformed, and so is an
   index with no dictionary entry.

Note: the implementation treats any shape character other than `(`, `)`, `s`, `t`, `h` as `i`, and it
ignores values left over in a ref line. A strict reader SHOULD reject both.

### Version and plain bundles

A reader checks whether the text starts with `DEUSCOL1`. If it does, it decodes the columns. If not,
it parses the text as plain canonical S-expressions (bundles written before D60). A future encoding
needs a new magic. The implementation only tests the prefix of line 1, and it would hand an unknown
magic such as `DEUSCOL2` to the S-expression reader, which then fails because the text is not one
form. A reader MUST NOT decode a magic it does not know.

## Worked example

This is a real bundle, written by `deus push` from a codebase made with `deus init --empty`. The
codebase has one causal node and one empty namespace:

```text
objects/67/67c7d5a6…6601   (causal (ns "f126eadc…a595") (parents) (msg "init"))
objects/f1/f126eadc…a595   (ns)
```

The bundle form is:

```text
(bundle (branch "main" "67c7…6601")
  (obj "67c7…6601" (causal (ns "f126…a595") (parents) (msg "init")))
  (obj "f126…a595" (ns)))
```

The encoded text (the hashes line is 128 characters, shown unbroken):

```text
DEUSCOL1
(s(sth)(sh(s(sh)(s)(st)))(sh(s)))
("bundle" "branch" "obj" "causal" "ns" "parents" "msg")
("main" "init")
67c7d5a614b378f4ec980ba1804d6f656d73975b9feafc119fcf4bf620e16601f126eadc463e81d2636be4aa0384edbe2aee5690395678593e789ce423bda595
0 1 2 3 4 5 6 2 4
0 1
0 0 1 1

```

The last line, integers, is empty: the form has no integers. Reading the shape against the columns:

| Shape                | Refs used                                                | Result                                                       |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| `(s`                 | sym 0                                                    | `(bundle`                                                    |
| `(sth)`              | sym 1, str 0, hash 0                                     | `(branch "main" "67c7…")`                                    |
| `(sh(s(sh)(s)(st)))` | sym 2, hash 0, sym 3, sym 4, hash 1, sym 5, sym 6, str 1 | `(obj "67c7…" (causal (ns "f126…") (parents) (msg "init")))` |
| `(sh(s)))`           | sym 2, hash 1, sym 4                                     | `(obj "f126…" (ns)))`                                        |

The text is 274 bytes. `sha256` of it is `a86b65c3…340f`, so the bundle is named
`0-a86b65c302098f3ddcb8dc11e7b496bce75bb2b7231a9267724f9d293808340f`. The stored file is 217 bytes of
gzip. A second push, of a definition with metadata, shows an `i` token: `(term (lam (var 0)))` gives
shape `(s(s(si)))` and the integers line `0`.

## Compression

Remotes store each bundle as gzip (RFC 1952) of the bundle text. The writer runs `gzip -n -9`:

- `-n` leaves out the file name and sets MTIME to 0, so equal texts give equal files from the same
  gzip build. Observed header: `1f 8b 08 00 00 00 00 00 02 03` (deflate, no flags, MTIME 0, XFL 2
  for maximum compression, OS 3 for Unix).
- Byte identity of the compressed file is a convenience, not a rule: names hash the uncompressed
  text, so a reader MUST NOT depend on the compressed bytes.

A reader runs `gzip -dcf`: data that starts with the gzip magic `1f 8b` is decompressed, and other
data passes through unchanged. So a remote may hold plain bundles too. Compression and
decompression happen only at the remote boundary, inside the `Remote` handlers. `push` and `compact`
hash and seen-record the plain text.

## Remote layout

The `Remote` ability is the whole interface: `list`, `get`, `put` (never overwrites), `delete`, and
`writeAll` for files beside the bundles. A remote URL is stored locally in `remotes/<name>/url`.

| Remote URL                | Bundles at                                  | Other files                |
| ------------------------- | ------------------------------------------- | -------------------------- |
| a directory path `<root>` | `<root>/bundles/<name>`                     | `<root>/site/…` (explorer) |
| `r2://<bucket>/<prefix>`  | key `<prefix>/bundles/<name>` in `<bucket>` | keys `<prefix>/site/…`     |
| `r2://<bucket>`           | prefix defaults to `deus`                   |                            |

There is no manifest, index or heads file on the remote. The bundle names are the whole state, and
heads are computed from claims (next section). The explorer site under `site/` is described in
[EXPLORER.md](EXPLORER.md); its upload record `cache/site-<remote>.sums` is local.

Directory remote:

- `list` returns the file names in `bundles/`, skipping names that end in `.tmp`.
- `put` writes `<name>.tmp`, compresses it to `<name>.tmp.gz` and moves it to `<name>`. It does
  nothing if `<name>` exists.

S3-compatible bucket (Cloudflare R2), path-style URLs `$DEUS_R2_ENDPOINT/<bucket>/<key>`, signed with
SigV4 by `curl --aws-sigv4 aws:amz:auto:s3`. Credentials come from `$R2_ACCESS_KEY_ID` and
`$R2_SECRET_ACCESS_KEY` and go in a mode-600 curl config file, never on a command line.

| Op       | Request                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`   | `GET ?list-type=2&prefix=<prefix>/bundles/[&continuation-token=<t>]`; names are the `<Key>` values with the prefix removed; follows `NextContinuationToken` |
| `get`    | `GET <prefix>/bundles/<name>`, then `gzip -dcf`; a failed request reads as absent                                                                           |
| `put`    | `PUT <prefix>/bundles/<name>` with `If-None-Match: *` and the gzip body; `PreconditionFailed` is success                                                    |
| `delete` | `DELETE <prefix>/bundles/<name>`; the result is not checked                                                                                                 |

Note: the continuation token is not URL-encoded, and the `PUT` body carries curl's default
`--data-binary` content type (`application/x-www-form-urlencoded`).

A reader SHOULD ignore listed names that do not match the bundle name grammar. The implementation
fetches every listed name and fails if one does not decode to one form.

## Local tracking state

A client records what it has read so it reads each bundle once:

```text
remotes/<remote>/url             the remote URL, one line
remotes/<remote>/seen/<bundle>   (seen (branch "<b>" "<causal>")… (hashes "<h>"…))
```

`seen` lists the bundle's claims and the hashes of its `obj` items (not `meta`). `sync` lists the
remote, reads `seen/<name>` when present, and otherwise fetches, imports and records the bundle. A
bundle deleted from the remote drops out because only listed names are used.

## Heads

For a branch `b`, collect every claim `(branch b c)` across all listed bundles, then sort and
deduplicate the causal hashes. The heads are the claimed nodes that are not an ancestor of another
claimed node. Ancestry follows `parents` in causal objects; a parent the store lacks is treated as
a root (shallow history, [D54](../DECISIONS.md)).

`pull` sets local branches from the sorted heads:

| Head (sorted by hash) | Local branch            |
| --------------------- | ----------------------- |
| 1st                   | `<remote>.<branch>`     |
| 2nd                   | `<remote>.<branch>.2`   |
| nth                   | `<remote>.<branch>.<n>` |

Two heads mean concurrent pushes; the user merges `<remote>.<branch>.2` as any branch. Note:
`pull` does not remove a `.2` branch left from an earlier pull once the heads join.

`push` of branch `b` computes the closure of its head: every causal ancestor, their namespace and
tasks snapshots, and everything the named entries reach. It uploads one level-0 bundle with the
claim `(b, head)` and the closure hashes that no seen bundle lists. If nothing is missing and the
claim already exists, it uploads nothing.

## Sedimentree compaction

`deus compact [remote] [--level k]` (default `k = 1`, [D50](../DECISIONS.md)):

1. Take all heads of all branches and the union of their ancestors (the history).
2. A boundary is a causal node in the history whose hash starts with `k` zeros (`"0"` repeated `k`
   times; at `k = 0` every node is a boundary).
3. For each boundary `B`, its stratum is the closure of `B` minus the closure of the boundaries that
   are proper ancestors of `B`.
4. Write each stratum as a bundle with no claims, named `<k>-<sha256>`, unless that name is already
   listed.
5. A bundle is removable when its level is below `k`, it lists at least one hash, and every hash it
   lists is in some stratum.
6. Claims in removable bundles that are still heads are written first into one claims-only level-0
   bundle (unless it exists). Then the removable bundles are deleted.

History newer than the last boundary stays in its level-0 bundles. Boundaries come from hashes and
bundles are canonical, so clients compacting the same history write byte-identical bundles.

Observed: 30 level-0 bundles whose head `01786a06…` starts with one zero compact at level 1 into one
`1-192de339…` bundle and a claims-only `0-013c20ea…` bundle holding `(branch "main" "01786a06…")`.

## History is never trimmed

A remote keeps every causal node and everything it reaches, as git does ([D72](../DECISIONS.md)).
The only deletion is step 6 of compaction, of bundles whose objects strata already hold. There is no
retention GC: `deus compact --keep` exits with an error. Artifacts and the cache are local layers and
are never uploaded, so deleting them never touches a remote.

Note: a remote collected by the GC that D54 described has shallow history. Readers treat parents that
no store has as roots.
