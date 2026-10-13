# Agent — open questions

Questions raised while building the agent. The brain questions carry Dmytro's recommendations for Rich to review;
the rest are open. Move a question into the relevant design doc once it is decided, and delete it here.

## Brain and facts (recommendations)

### 1. Facts as named graphs, with real IRIs

**Today** a fact is stored reified (pipeline-rdf `DESIGN.md`, "Reification"): a fact node carries `sx:subject`,
`sx:predicate` and `sx:object`, and the predicate is a string literal. The statement is never a triple itself, so
standard RDF tooling cannot ask `?s :hasRole ?o`, and pipeline-rdf fuzzy-matches the predicate string instead.
Entities are slugs (`entity:rich-burdon`) with no link to the ECHO objects they name (`Entity.ref` exists for that but
is never set). The design doc weighs reification only against RDF-star; named graphs are not discussed.

Current output for one sentence of the roster the Setup story seeds:

```turtle
fact:https%3A%2F%2Fdxos.org%2Fteam%23e7f0d44f%231
  sx:subject entity:rich-burdon ;
  sx:predicate "is-a" ;
  sx:object entity:founder ;
  sx:factuality "CT+" ;
  sx:polarity "+" ;
  prov:wasDerivedFrom "https://dxos.org/team" ;
  prov:generatedAtTime "2026-10-13T07:53:53.704Z" ;
  sx:recordedAt "2026-10-13T07:53:53.704Z" ;
  sx:sourceHash "e7f0d44f" ;
  sx:extractorId "default" ;
  sx:extractorModel "com.anthropic.model.claude-haiku-4-5.default" ;
  sx:extractorVersion "1" ;
  sx:quote "Rich Burdon (Rich) is on the DXOS team as Founder" ;
  sx:subjectLabel "Rich Burdon" ;
  sx:objectLabel "Founder" .
```

**Recommendation:**

- **Named graphs replace reification.** The statements are real triples inside a named graph, and the provenance is
  stated once, about the graph. This is standard RDF 1.1 (TriG, N-Quads, SPARQL `GRAPH`), needs no RDF-star, and the
  store already has the column for it (`triples.g`, always empty today).
- **The extractor names the graph, and a graph holds several facts.** Statements that share provenance (the same
  source, quote, speaker, time, extraction pass and factuality) go in one graph. Where they differ, for example two
  sentences with different quotes, the extractor starts another graph.
- **Predicates are real IRIs, from an extensible ontology.** The ontology starts small (`dx:hasRole`, `dx:memberOf`,
  `dx:knowsAbout`, …) and grows: the extractor may propose a new predicate, which is minted with its label and
  description. The brain keeps metadata about each predicate (labels, synonyms, domain and range, inverse), so the
  synonym table in `normalize-predicates` and the brain's canonical `Vocabulary` become one ontology.
- **Entities are real IRIs wherever the extractor can tell.** An ECHO object by its space-qualified URI
  (`echo://<spaceId>/<objectId>`), a person by `mailto:` or their Discord account, a page by its URL. When it cannot,
  it mints a temporary IRI scoped to the graph (or to the extraction context: the message or document) and states what
  it knows about it: a label, a kind, the surface form. Resolving it later (`resolveEntity`) links the temporary IRI to
  the real one with `owl:sameAs`, or rewrites it.

The same sentence after:

```trig
@prefix dx:   <https://dxos.org/ontology/> .
@prefix sx:   <https://dxos.org/semantic#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix g:    <https://dxos.org/semantic/graph/team-e7f0d44f/> .

# The statements: real triples, about real entities, with ontology predicates.
g:roles {
  <echo://BBW5ANOFUMCIHWGKE2W3JFTXJUOATRJKF/01M4Q8RICH0000000000000000> dx:hasRole g:founder ;
    dx:memberOf <echo://BBW5ANOFUMCIHWGKE2W3JFTXJUOATRJKF/01M4Q8DXOS0000000000000000> .
  # Not yet resolved to an object, so scoped to this extraction, with what the extractor knows about it.
  g:founder a dx:Role ;
    rdfs:label "Founder" .
}

# The provenance: stated once, for every statement in the graph.
g:roles
  prov:wasDerivedFrom <https://dxos.org/team> ;
  prov:generatedAtTime "2026-10-13T07:53:53.704Z"^^xsd:dateTime ;
  sx:recordedAt "2026-10-13T07:53:53.704Z"^^xsd:dateTime ;
  sx:factuality "CT+" ;
  sx:polarity "+" ;
  sx:quote "Rich Burdon (Rich) is on the DXOS team as Founder" ;
  sx:sourceHash "e7f0d44f" ;
  sx:extractor <https://dxos.org/semantic/extractor/default/1> .

# The ontology: predicates carry their own metadata in the brain.
dx:hasRole a rdf:Property ;
  rdfs:label "has role" ;
  sx:synonym "is a", "works as", "is on the team as" ;
  rdfs:range dx:Role .
```

The labels that the reified form stored per fact (`sx:subjectLabel`, `sx:objectLabel`) move onto the entities, and
`GRAPH ?g { ?who dx:hasRole ?role } . ?g prov:wasDerivedFrom ?source` is now an ordinary query.

**What it costs:** a migration of the stored facts, the extractor prompt and its output schema, `SemanticQuery` and
`querySqlite` (exact predicates instead of fuzzy matching), and the brain's Datalog encoding (`Encoding.ts`), whose
`fact(F, S, P, O)` becomes a statement plus its graph.

### 2. Memories become a kind of fact

**Today** there are two representations of what the agent knows: memories (`Memory`, ECHO objects, the Memories tab)
and facts (the brain, the Facts tab). Nothing keeps them in sync, and both tabs show items labelled "Fact".

**Recommendation:** remove `Memory`. A memory is a fact whose graph says what kind it is (preference, commitment,
relationship, event, …), attached to the ECHO objects it is about through the entity IRIs (question 1), and stored in
ECHO feeds like every other fact (question 2). `recordMemory` becomes an extraction that writes a graph;
superseding or retracting a memory becomes a statement about its graph; the profile panel is built from facts.
