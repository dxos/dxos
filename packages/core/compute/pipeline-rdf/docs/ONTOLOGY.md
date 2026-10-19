# Predicate ontology

How a brain names relations: what a predicate is, which vocabularies the seed predicates come from, and why a
predicate has a display label as well as an IRI. The code is `RDF.Ontology` (`src/types/Ontology.ts`); storage
is in [DESIGN.md](../DESIGN.md#named-graphs-storage-shape).

## A predicate has one identity and many wordings

Every predicate is an `Entry`. Its **IRI** is the identity; everything else is a wording that leads to it or
a description of it.

| Field         | Example (`born_in`)               | RDF                      | Used for                                            |
| ------------- | --------------------------------- | ------------------------ | --------------------------------------------------- |
| `iri`         | `schema:birthPlace`               | the property itself      | Storage and matching: every fact stores this.       |
| `name`        | `born_in`                         | `sx:shorthand`           | Rule shorthand: `born_in(rich, X)`.                 |
| `label`       | `born in`                         | `rdfs:label`             | Display, and a wording that resolves to the IRI.    |
| `synonyms`    | `was born in`, `birthplace`       | `skos:altLabel`          | Wordings that resolve to the IRI.                   |
| `description` | The place the subject was born.   | `rdfs:comment`           | Shown to the extractor and in the UI.               |
| `domain`      | `schema:Person`                   | `rdfs:domain`            | The class of the subject.                           |
| `range`       | `schema:Place`                    | `rdfs:range`             | The class of the object.                            |
| `inverse`     | `schema:member` (for `member_of`) | `owl:inverseOf`          | The same relation read the other way.               |
| `equivalents` | `dx:memberOf`, `org:memberOf`     | `owl:equivalentProperty` | Other IRIs a query for this predicate also matches. |
| `definedBy`   | `https://schema.org/`             | `rdfs:isDefinedBy`       | The vocabulary the term belongs to.                 |

A minted predicate also records `created`, `creator` and `example` (when, by what extractor, from which quote),
and a merged one `replacedBy`.

### Wordings resolve to the IRI; only the IRI is stored

`Ontology` indexes each entry under its **name, label and synonyms alike**. The label is not special in the
index: `was born in` finds `born_in` as surely as `born in` does. Each wording is reduced to a relation key
(`Ontology.key`) before lookup, so spelling and inflection don't matter:

- spaces, `-`, `_` and camelCase boundaries are the same (`born in` = `born-in` = `born_in` = `bornIn`);
- a leading copula is dropped (`is member of` = `member of`);
- the first word is stemmed (`works for` = `work for` = `working for`).

Every place text enters the brain resolves a wording to an IRI first:

- extraction maps the model's phrase onto a known predicate (`stages/extract-facts.ts`);
- `normalize-predicates` maps surface predicates onto the vocabulary;
- queries resolve before they match: `store.query({ predicate: 'is working at' })`, and SPARQL predicates
  that are not IRIs (`internal/sparql/query-builder.ts`).

After that, matching compares IRIs (plus their equivalents and replacements), never strings. Renaming a label
changes no stored fact. Two entries may not claim the same wording: the constructor throws
`Synonym … maps to both …`.

### Why wordings, rather than IRIs everywhere

The rule is **normalize the join key, never the display**. The IRI is the join key; wordings exist because
everything that writes or asks about facts speaks in words.

1. **Facts come from prose.** The extractor reads "Rich is on the team as founder" and writes a verb phrase.
   Mapping it to `schema:jobTitle` is a separate, improvable layer, so paraphrases (`works at`,
   `employed by`, `works for`) collapse onto one IRI without extracting again.
2. **Models reuse words, not IRIs.** The extractor is shown the vocabulary as shorthand, wordings and
   definitions. `born in` is something a model reliably reuses; `schema:birthPlace` is opaque, and a noun
   name such as `jobTitle` for a role invites misuse.
3. **New predicates start as words.** A wording the ontology does not know is minted from its relation key;
   there is no IRI until then (see [Minting](#minting-and-merging)).
4. **External IRIs are chosen for interchange, not reading.** They are often nouns that do not say which
   way the relation runs (`creator`), so display needs a label of its own.
5. **IRIs move; wordings stay.** Seeds have already moved from `dx:` to shared vocabularies. A query
   written as `'works at'`, or a rule `works_on(dima, X)`, keeps working because it resolves to whatever the
   IRI is now.
6. **Rules need short names.** `works_on(dima, X)` is readable; the full IRI is not.

### Display: kebab-case labels

A UI shows a predicate as `RDF.Predicate.label(entry.label)`: lowercase kebab-case, so the label the seeds
give, the phrase an extractor mints and an inverse a UI derives all read as one vocabulary (`born-in`,
`member-of`, `known-by`). Unlike `normalize`, it keeps the words as said: no stemming, no dropped copula.
The IRI is shown as a prefixed name (`schema:birthPlace`) beside it.

Labels are verb phrases read along the arrow, so a property row reads as a sentence: _Rich born-in Ottawa_,
_Paper created-by Alice_. External vocabularies often name the **value** instead, as a noun. That is why a
label and its IRI can differ in words, not just in case:

| Label         | IRI                 | How they relate                           |
| ------------- | ------------------- | ----------------------------------------- |
| `member-of`   | `schema:memberOf`   | Same words; only the case differs.        |
| `works-for`   | `schema:worksFor`   | Same words.                               |
| `knows`       | `foaf:knows`        | Same word.                                |
| `born-in`     | `schema:birthPlace` | The IRI names the value: the place.       |
| `has-role`    | `schema:jobTitle`   | The IRI names the value: the title.       |
| `located-in`  | `schema:location`   | The IRI names the value: the location.    |
| `has-account` | `foaf:account`      | The IRI names the value: the account.     |
| `created-by`  | `dcterms:creator`   | The IRI names the value: the creator.     |
| `is-a`        | `rdf:type`          | RDF's own term for class membership.      |
| `depends-on`  | `dcterms:requires`  | Dublin Core's word for the same relation. |

## Where the seed predicates come from

`DEFAULT_ENTRIES` is the vocabulary every brain starts with. A relation an established vocabulary already
defines is stored under **that vocabulary's IRI**, so the brain's graph reads as schema.org, FOAF or Dublin
Core to any RDF tool. `dx:` holds only what none of them names.

| Prefix     | Vocabulary                                                                             | Seed predicates (label → IRI)                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rdf:`     | [RDF](https://www.w3.org/TR/rdf11-concepts/)                                           | `is-a` → `rdf:type`                                                                                                                                                                                                                                           |
| `rdfs:`    | [RDF Schema](https://www.w3.org/TR/rdf-schema/)                                        | `kind-of` → `rdfs:subClassOf`                                                                                                                                                                                                                                 |
| `owl:`     | [OWL](https://www.w3.org/TR/owl2-overview/)                                            | `same-as` → `owl:sameAs`                                                                                                                                                                                                                                      |
| `schema:`  | [schema.org](https://schema.org/)                                                      | `has-role` → `jobTitle`, `member-of` → `memberOf`, `has-member` → `member`, `works-for` → `worksFor`, `alumni-of` → `alumniOf`, `knows-about` → `knowsAbout`, `located-in` → `location`, `born-in` → `birthPlace`, `about` → `about`, `mentions` → `mentions` |
| `foaf:`    | [FOAF](http://xmlns.com/foaf/spec/)                                                    | `knows` → `foaf:knows`, `has-account` → `foaf:account`                                                                                                                                                                                                        |
| `dcterms:` | [Dublin Core terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/) | `created-by` → `dcterms:creator`, `part-of` → `dcterms:isPartOf`, `depends-on` → `dcterms:requires`                                                                                                                                                           |
| `skos:`    | [SKOS](https://www.w3.org/TR/skos-reference/)                                          | `related-to` → `skos:related`                                                                                                                                                                                                                                 |
| `dx:`      | DXOS (`https://dxos.org/ontology/`)                                                    | `founded`, `claim`, `has-note`, `helps-with`, `works-on`, `completed`, `shipped`, `proposes`, `received`, `archived`, `deleted`, `filed`, `drafted`, `notified`, `relayed`, `awaiting`                                                                        |
| `brain:`   | One brain's own (`https://dxos.org/semantic/brain/<id>/`)                              | Whatever that brain's extractor minted (`is blocked by` → `brain:blockBy`).                                                                                                                                                                                   |

`dx:` covers two kinds of relation:

- **What an agent records and does:** `claim`, `has-note`, `completed`, `notified`, and the rest.
- **A relation a shared vocabulary only states the other way round.** `founded` is `dx:founded` with
  `inverse: schema:founder`, since schema.org only has "the founder of the organization".

A `dx:` predicate's IRI is its name in camelCase (`works_on` → `dx:worksOn`), so its label and IRI differ only
in case.

The ontology also borrows terms to **describe** predicates rather than to state facts: `rdfs:label`,
`rdfs:comment`, `rdfs:domain`, `rdfs:range`, `rdfs:isDefinedBy`, `owl:inverseOf`,
`owl:equivalentProperty`, `owl:deprecated`, `skos:altLabel`, `skos:example`, `dcterms:created`,
`dcterms:creator` and `dcterms:isReplacedBy`. Provenance is PROV-O (`prov:wasAttributedTo`,
`prov:generatedAtTime`, `prov:wasDerivedFrom`), and this package's own metadata is `sx:`
(`https://dxos.org/semantic#`).

## Minting and merging

- **Minting.** `Ontology.resolve` on an unknown wording creates an entry in the ontology's namespace: its
  name is the relation key and its label is the wording as written (`is blocked by` → key `block_by` →
  `brain:blockBy`, label `is blocked by`). A brain mints in its own namespace, so a predicate one brain
  invented never poses as a shared term; two documents that phrase a relation the same way still share it.
  A brain's ontology is the seed plus what it minted (`Ontology.include`), and the extractor is shown it
  next time, so a minted predicate gets reused.
- **Equivalents.** A seed that moved from `dx:` to a shared vocabulary lists its old IRI as an equivalent
  (`schema:memberOf` lists `dx:memberOf` and W3C `org:memberOf`), so facts stored under the old IRI still
  match.
- **Merging.** `Ontology.merge(from, into)` folds one predicate into another: the survivor gains the other's
  IRI as an equivalent and its wordings as synonyms, and the other stays readable, marked
  `owl:deprecated` with `dcterms:isReplacedBy`. No stored statement is rewritten.

## RDF, quads and TriG

**RDF** is the data model, not a file format: everything is a statement of the form
_subject predicate object_ (a **triple**), where subject and predicate are IRIs and the object is an IRI or a
literal. RDF 1.1 adds a fourth position, the **graph** a triple belongs to, which makes it a **quad**. Formats
such as TriG, Turtle and N-Quads are ways of writing the same model down as text.

| Form                 | What it is                                                                               | Where the brain uses it                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `RDF.Fact`           | This package's TypeScript object for one statement and its provenance.                   | The application API: extraction, rules, recall and the UI all pass `Fact`s.                                                  |
| Quads                | The RDF model itself: `(subject, predicate, object, graph)` as n3 `Quad` terms.          | Storage. `Mapping.factToTriples` expands a fact into quads, `triplesToFacts` reassembles them.                               |
| SQLite `quads` table | The quads with each term interned as an integer id (`sparql-sqlite`, `terms` + `quads`). | What the brain persists: EDGE's Durable Object, or in memory in the app. SPARQL queries run against it.                      |
| **TriG**             | Text syntax for quads: Turtle, plus `<graph> { … }` blocks for named graphs.             | Display and inspection only: `RDF.Graph.toTriG` (facts) and `ontologyToTriG` (predicates). Never parsed back into the brain. |
| Turtle               | Text syntax for triples in one graph. TriG is a superset of it.                          | Not produced; the editor's `turtle()` language highlights TriG, since the syntax is the same apart from the graph blocks.    |

So the brain **stores RDF** (quads, in SQLite) and **shows TriG**. A fact is converted
`Fact → quads → SQLite` on write, and `SQLite → quads → Fact` on read; TriG is produced from facts or from the
ontology only when someone wants to look at them.

### A fact as TriG

A fact is a statement inside a **named graph**; the provenance shared by the graph's statements is stated once,
about the graph, outside it (`RDF.Graph.toTriG`, prefixes omitted):

```trig
fact:f1 {
  g1:rich-burdon schema:birthPlace g1:london ;
    rdfs:label "Rich Burdon" .
  g1:london rdfs:label "London" .
}
fact:f1 a sx:Graph ;
  sx:factuality "CT+" ;
  sx:polarity "+" ;
  prov:wasDerivedFrom "https://dxos.org/team" ;
  prov:generatedAtTime "2026-10-13T07:30:00Z" ;
  sx:quote "Rich was born in London" .
```

- `fact:f1 { … }` is the graph; its first line is the statement, with the predicate the extractor wrote
  (`was born in`) already resolved to `schema:birthPlace`.
- `g1:` entities are local to this graph: they were known only by a label, so a second graph's `london` is not
  assumed to be the same place. A known entity is written with its own IRI (`<echo://…>`, `<did:…>`).
- The lines after the block are in the default graph and describe `fact:f1` itself: factuality, source, time,
  quote and extractor (`sx:`, PROV-O).

A memory has the same shape: a graph of `<subject> dx:claim "…"` statements whose provenance also carries
`sx:kind` and `sx:origin` (see plugin-agent's `Knowledge`).

### A predicate as TriG

Predicates are described in their own graph, `Vocab.ONTOLOGY_GRAPH` (`graph:ontology`), never mixed into the
statements that use them (`RDF.Graph.ontologyToTriG`):

```trig
graph:ontology {
  schema:birthPlace a rdf:Property ;
    rdfs:label "born in" ;
    sx:shorthand "born_in" ;
    skos:altLabel "was born in", "birthplace" ;
    rdfs:domain schema:Person ;
    rdfs:range schema:Place ;
    rdfs:isDefinedBy <https://schema.org/> ;
    rdfs:comment "The place the subject was born." .
}
```

Each `Entry` field is one of these triples (the table in
[One identity and many wordings](#a-predicate-has-one-identity-and-many-wordings)), so a brain's vocabulary
travels with its facts and any RDF tool can read both.

## Where it is described

The ontology is stored as quads in the brain's ontology graph (`Vocab.ONTOLOGY_GRAPH`, written by `ontologyQuads`), never in a
statement graph; `FactStore.predicates` reads it back. In Composer, the agent's **Predicates** tab lists each
predicate with its label as the title and its IRI, vocabulary, description, synonyms and fact count below; its
raw view shows the ontology graph as TriG, and the Facts tab's raw view shows each fact's graph the same way.
