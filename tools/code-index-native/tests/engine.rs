//
// Copyright 2026 DXOS.org
//

use std::fs;
use std::path::PathBuf;

use code_index_native::facts::Dict;
use code_index_native::rules;
use code_index_native::store::{NativeStore, Stratum};
use oxigraph::model::{GraphName, NamedNode, Quad};

/// The IRIs a rule file names, as the N3 parser resolves its prefixes.
fn named_nodes(rules: &str) -> Vec<String> {
    let mut iris = Vec::new();
    for quad in oxttl::n3::N3Parser::new().for_slice(rules).flatten() {
        for term in [quad.subject, quad.predicate, quad.object] {
            if let oxttl::n3::N3Term::NamedNode(node) = term {
                iris.push(node.into_string());
            }
        }
    }
    iris
}

const DEUS: &str = "https://dxos.org/vocab/deus#";
const DERIVED: &str = "https://dxos.org/deus/graph/derived/";

fn rules_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../code-index/rules")
}

/// The shipped rule files, as `Reasoner.load` orders them.
fn shipped() -> Vec<Stratum> {
    let mut names: Vec<_> = fs::read_dir(rules_dir())
        .unwrap()
        .map(|entry| entry.unwrap().file_name().into_string().unwrap())
        .filter(|name| name.ends_with(".n3"))
        .collect();
    names.sort();
    names
        .into_iter()
        .map(|name| Stratum {
            graph: format!("{DERIVED}{}", name.trim_end_matches(".n3")),
            rules: fs::read_to_string(rules_dir().join(&name)).unwrap(),
        })
        .collect()
}

/// Whether DRed maintains the stratum, rather than recomputing it each pass.
fn maintainable(stratum: &Stratum) -> bool {
    rules::compile(&stratum.rules, &Dict::default())
        .unwrap()
        .maintainable
}

fn derived(store: &NativeStore, graph: &str) -> Vec<String> {
    let mut quads: Vec<String> = store
        .match_quads(
            None,
            None,
            None,
            Some(NamedNode::new_unchecked(graph).into()),
        )
        .unwrap()
        .into_iter()
        .map(|quad| format!("{} {} {}", quad.subject, quad.predicate, quad.object))
        .collect();
    quads.sort();
    quads
}

#[test]
fn every_shipped_rule_file_compiles() {
    for stratum in shipped() {
        let dict = Dict::default();
        rules::compile(&stratum.rules, &dict)
            .unwrap_or_else(|error| panic!("{}: {error}", stratum.graph));
    }
}

#[test]
fn unsupported_builtins_are_rejected_by_name() {
    let dict = Dict::default();
    let error = rules::compile(
        "@prefix math: <http://www.w3.org/2000/10/swap/math#>. { ?a <urn:p> ?b. ?b math:sum ?c } => { ?a <urn:q> ?c }.",
        &dict,
    );
    assert!(
        error.is_ok(),
        "a non-builtin namespace is an ordinary predicate"
    );
    let error = rules::compile(
        "@prefix log: <http://www.w3.org/2000/10/swap/log#>. { ?a <urn:p> ?b. ?b log:semantics ?c } => { ?a <urn:q> ?c }.",
        &dict,
    )
    .unwrap_err();
    assert!(error.to_string().contains("log#semantics"), "{error}");
    let error = rules::compile(
        "@prefix log: <http://www.w3.org/2000/10/swap/log#>. @prefix list: <http://www.w3.org/2000/10/swap/list#>.
         { ?a <urn:p> ?b. (?x { ?x <urn:q> ?b } ?l) log:collectAllIn ?s. ?l list:length 0 } => { ?a <urn:q> ?b }.",
        &dict,
    )
    .unwrap_err();
    assert!(error.to_string().contains("not stratifiable"), "{error}");
}

fn symbol(path: &str, name: &str) -> String {
    format!("https://dxos.org/deus/file/{}#{name}", path)
}

fn file(path: &str) -> String {
    format!("https://dxos.org/deus/file/{path}")
}

fn nquads(graph: &str, triples: &[(String, &str, String)]) -> String {
    triples
        .iter()
        .map(|(s, p, o)| format!("<{s}> <{DEUS}{p}> {o} <{graph}> .\n"))
        .collect()
}

#[test]
fn canonical_names_follow_the_namespace_barrel() {
    let store = NativeStore::in_memory(1000).unwrap();
    let (module, barrel) = ("src/Ontology.ts", "src/index.ts");
    let exported = "\"true\"^^<http://www.w3.org/2001/XMLSchema#boolean>";
    store
        .insert_quads(&nquads(
            "urn:graph:a",
            &[
                (
                    file(module),
                    "declares",
                    format!("<{}>", symbol(module, "iri")),
                ),
                (symbol(module, "iri"), "name", "\"iri\"".into()),
                (symbol(module, "iri"), "exported", exported.into()),
                (
                    file("src/plain.ts"),
                    "declares",
                    format!("<{}>", symbol("src/plain.ts", "helper")),
                ),
                (
                    symbol("src/plain.ts", "helper"),
                    "name",
                    "\"helper\"".into(),
                ),
                (
                    symbol("src/plain.ts", "helper"),
                    "exported",
                    exported.into(),
                ),
            ],
        ))
        .unwrap();
    let strata: Vec<Stratum> = shipped()
        .into_iter()
        .filter(|stratum| stratum.graph.ends_with("60-canonical"))
        .collect();
    store.reason_all(&strata).unwrap();
    let graph = &strata[0].graph;
    assert_eq!(
        derived(&store, graph),
        vec![
            format!("<{}> <{DEUS}canonicalName> \"iri\"", symbol(module, "iri")),
            format!(
                "<{}> <{DEUS}canonicalName> \"helper\"",
                symbol("src/plain.ts", "helper")
            ),
        ]
    );

    // The barrel arrives: the bare name is retracted (negation flips) and the qualified one concluded.
    store
        .insert_quads(&nquads(
            "urn:graph:b",
            &[
                (
                    symbol(barrel, "Ontology"),
                    "namespaceOf",
                    format!("<{}>", file(module)),
                ),
                (symbol(barrel, "Ontology"), "name", "\"Ontology\"".into()),
            ],
        ))
        .unwrap();
    let outcomes = store.reason_all(&strata).unwrap();
    assert!(outcomes[0].incremental);
    assert_eq!(
        derived(&store, graph),
        vec![
            format!(
                "<{}> <{DEUS}canonicalName> \"Ontology.iri\"",
                symbol(module, "iri")
            ),
            format!(
                "<{}> <{DEUS}canonicalName> \"Ontology\"",
                symbol(barrel, "Ontology")
            ),
            format!(
                "<{}> <{DEUS}canonicalName> \"helper\"",
                symbol("src/plain.ts", "helper")
            ),
        ]
    );

    // And leaves again.
    store.drop_graphs(&["urn:graph:b".into()]).unwrap();
    store.reason_all(&strata).unwrap();
    assert_eq!(derived(&store, graph).len(), 2);
    assert!(derived(&store, graph)[0].ends_with("\"iri\""));
}

#[test]
fn the_journal_is_invisible_to_queries() {
    let store = NativeStore::in_memory(1000).unwrap();
    store
        .insert_quads(&nquads(
            "urn:graph:a",
            &[(file("a.ts"), "path", "\"a.ts\"".into())],
        ))
        .unwrap();
    store.reason_all(&shipped()).unwrap();
    // Now journalling: this write lands a journal entry, which lives outside the queried store.
    store
        .insert_quads(&nquads(
            "urn:graph:a",
            &[(file("b.ts"), "path", "\"b.ts\"".into())],
        ))
        .unwrap();
    assert_eq!(store.journal_len(), 1);
    let (_, body) = store
        .query("SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }")
        .unwrap();
    assert!(body.contains("\"value\":\"2\""), "{body}");
    assert_eq!(store.quad_count().unwrap(), 2);
}

/// A tiny deterministic generator, so a failure reproduces from its seed.
struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }

    fn pick<'a, T>(&mut self, items: &'a [T]) -> &'a T {
        &items[(self.next() % items.len() as u64) as usize]
    }
}

/// Random premises built from the vocabulary the shipped rules mention, so most rules can fire.
fn random_quad(rng: &mut Rng, constants: &[String], graphs: &[String]) -> Quad {
    let nodes: Vec<String> = (0..12).map(|index| format!("urn:node:{index}")).collect();
    let predicates = [
        "constructedBy",
        "extends",
        "argument",
        "pipedThrough",
        "derivedFrom",
        "implDependsOn",
        "apiDependsOn",
        "aliasOf",
        "declares",
        "namespaceOf",
        "imports",
    ];
    let subject = NamedNode::new_unchecked(rng.pick(&nodes).as_str());
    let graph: GraphName = NamedNode::new_unchecked(rng.pick(graphs).as_str()).into();
    match rng.next() % 6 {
        0 => Quad::new(
            subject,
            NamedNode::new_unchecked("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            NamedNode::new_unchecked(rng.pick(constants).as_str()),
            graph,
        ),
        1 => {
            let (predicate, value) = rng.pick(&[
                ("name", "\"A\""),
                ("name", "\"B\""),
                ("path", "\"x.test.ts\""),
                ("path", "\"x.ts\""),
                ("exported", "true"),
            ]);
            let object: oxigraph::model::Term = if *value == "true" {
                oxigraph::model::Literal::from(true).into()
            } else {
                oxigraph::model::Literal::new_simple_literal(value.trim_matches('"')).into()
            };
            Quad::new(
                subject,
                NamedNode::new_unchecked(format!("{DEUS}{predicate}")),
                object,
                graph,
            )
        }
        _ => {
            let object = if rng.next().is_multiple_of(2) {
                rng.pick(&nodes).clone()
            } else {
                rng.pick(constants).clone()
            };
            Quad::new(
                subject,
                NamedNode::new_unchecked(format!("{DEUS}{}", rng.pick(&predicates))),
                NamedNode::new_unchecked(object),
                graph,
            )
        }
    }
}

#[test]
fn incremental_maintenance_matches_recomputation() {
    let strata = shipped();
    // Every IRI the rules name (prefixed or not) as the parser resolves it, plus the classes the
    // rules conclude, so random premises hit the rules' constants.
    let constants: Vec<String> = strata
        .iter()
        .flat_map(|stratum| named_nodes(&stratum.rules))
        .filter(|iri| iri.starts_with("https://dxos.org/deus/"))
        .chain(
            [
                "EffectService",
                "EffectLayer",
                "Operation",
                "OperationHandler",
                "PluginModule",
                "Capability",
                "Plugin",
                "Skill",
            ]
            .iter()
            .map(|name| format!("{DEUS}{name}")),
        )
        .collect();
    let graphs: Vec<String> = (0..4).map(|index| format!("urn:graph:{index}")).collect();

    for seed in 1..=40u64 {
        let mut rng = Rng(seed.wrapping_mul(0x9e37_79b9_7f4a_7c15));
        let store = NativeStore::in_memory(100_000).unwrap();
        let initial: Vec<Quad> = (0..120)
            .map(|_| random_quad(&mut rng, &constants, &graphs))
            .collect();
        store
            .insert_quads(&NativeStore::to_nquads(&initial).unwrap())
            .unwrap();
        store.reason_all(&strata).unwrap();

        for round in 0..4 {
            // Churn: add quads, remove some existing ones, replace a whole graph.
            let added: Vec<Quad> = (0..15)
                .map(|_| random_quad(&mut rng, &constants, &graphs))
                .collect();
            store
                .insert_quads(&NativeStore::to_nquads(&added).unwrap())
                .unwrap();
            let existing = store.match_quads(None, None, None, None).unwrap();
            let base: Vec<Quad> = existing
                .into_iter()
                .filter(|quad| !quad.graph_name.to_string().contains("derived"))
                .collect();
            let removed: Vec<Quad> = (0..15).map(|_| rng.pick(&base).clone()).collect();
            store
                .remove_quads(&NativeStore::to_nquads(&removed).unwrap())
                .unwrap();
            if round % 2 == 1 {
                store.drop_graphs(&[rng.pick(&graphs).clone()]).unwrap();
            }

            let outcomes = store.reason_all(&strata).unwrap();
            for (stratum, outcome) in strata.iter().zip(&outcomes) {
                assert_eq!(
                    outcome.incremental,
                    maintainable(stratum),
                    "seed {seed}: {} took the wrong path",
                    stratum.graph
                );
            }
            let incremental: Vec<Vec<String>> = strata
                .iter()
                .map(|stratum| derived(&store, &stratum.graph))
                .collect();

            store.invalidate().unwrap();
            let outcomes = store.reason_all(&strata).unwrap();
            assert!(outcomes.iter().all(|outcome| !outcome.incremental));
            let full: Vec<Vec<String>> = strata
                .iter()
                .map(|stratum| derived(&store, &stratum.graph))
                .collect();
            for ((stratum, incremental), full) in strata.iter().zip(&incremental).zip(&full) {
                assert_eq!(
                    incremental, full,
                    "seed {seed} round {round}: {} diverged",
                    stratum.graph
                );
            }
        }
    }
}

#[test]
fn an_overflowing_journal_falls_back_to_recomputation() {
    let store = NativeStore::in_memory(3).unwrap();
    let strata = shipped();
    store.reason_all(&strata).unwrap();
    let many: String = (0..10)
        .map(|index| format!("<urn:s:{index}> <{DEUS}path> \"p{index}\" <urn:graph:a> .\n"))
        .collect();
    store.insert_quads(&many).unwrap();
    assert!(
        store
            .reason_all(&strata)
            .unwrap()
            .iter()
            .all(|outcome| !outcome.incremental)
    );
    // The recomputation restarts the journal.
    store
        .insert_quads(&nquads(
            "urn:graph:a",
            &[(file("c.ts"), "path", "\"c.ts\"".into())],
        ))
        .unwrap();
    let outcomes = store.reason_all(&strata).unwrap();
    assert!(
        strata
            .iter()
            .zip(&outcomes)
            .all(|(stratum, outcome)| outcome.incremental == maintainable(stratum))
    );
}

/// Reasons one rule file over N-Quads premises and returns its conclusions, sorted.
fn conclude(premises: &str, rules: &str) -> Vec<String> {
    let store = NativeStore::in_memory(1000).unwrap();
    store.insert_quads(premises).unwrap();
    let graph = format!("{DERIVED}test");
    store
        .reason_all(&[Stratum {
            graph: graph.clone(),
            rules: rules.into(),
        }])
        .unwrap();
    derived(&store, &graph)
}

const PREFIXES: &str = "@prefix : <urn:>. @prefix list: <http://www.w3.org/2000/10/swap/list#>.
    @prefix log: <http://www.w3.org/2000/10/swap/log#>. @prefix string: <http://www.w3.org/2000/10/swap/string#>.";

#[test]
fn backward_rules_are_proved_for_their_caller_and_never_stored() {
    let premises = "<urn:a> <urn:alias> <urn:b> <urn:g> .\n<urn:b> <urn:alias> <urn:c> <urn:g> .\n<urn:c> <urn:kind> \"decl\" <urn:g> .\n";
    // `?x :origin ?x` binds its object only from its subject, which the caller supplies; the alias
    // chain recurses through the same predicate.
    let rules = format!(
        "{PREFIXES}
        {{ ?x :origin ?x }} <= {{ ?x :kind \"decl\" }}.
        {{ ?x :origin ?d }} <= {{ ?x :alias ?y. ?y :origin ?d }}.
        {{ ?x :alias ?y. ?x :origin ?d }} => {{ ?x :resolves ?d }}."
    );
    assert_eq!(
        conclude(premises, &rules),
        vec![
            "<urn:a> <urn:resolves> <urn:c>",
            "<urn:b> <urn:resolves> <urn:c>"
        ]
    );
}

#[test]
fn a_call_waits_for_the_atoms_written_before_it() {
    // Proved with `?s` unbound, the counts would be over every symbol's stages and never agree.
    let premises = "<urn:a> <urn:stage> <urn:keep> <urn:g> .\n<urn:b> <urn:stage> <urn:drop> <urn:g> .\n<urn:a> <urn:type> <urn:Layer> <urn:g> .\n";
    let rules = format!(
        "{PREFIXES}
        {{ ?s :keeps true }} <= {{
          (?x {{ ?s :stage ?x }} ?all) log:collectAllIn ?scope.
          (?x {{ ?s :stage ?x. ?x list:in (:keep) }} ?kept) log:collectAllIn ?scope.
          ?all list:length ?n. ?kept list:length ?n.
        }}.
        {{ ?s :type :Layer. ?s :keeps true }} => {{ ?s :kept true }}."
    );
    assert_eq!(
        conclude(premises, &rules),
        vec!["<urn:a> <urn:kept> \"true\"^^<http://www.w3.org/2001/XMLSchema#boolean>"]
    );
}

#[test]
fn ground_facts_lists_and_string_builtins() {
    let premises = "<https://x.org/file/a.ts#make> <urn:calls> <urn:Type.makeObject> <urn:g> .\n";
    let rules = format!(
        "{PREFIXES}
        :Type.makeObject :factoryOf :EchoType.
        {{ (?s ?f) :pair ?f }} <= {{ ?s :calls ?f }}.
        {{ ?s :calls ?f. (?s ?f) :pair ?g. ?g :factoryOf ?class }} => {{ ?s :a ?class }}.
        {{ ?s :calls ?f. ?s log:uri ?text. ?text string:startsWith \"https://x.org/\".
           (\"/\" \"file\" \"/(.*)#\") string:concatenation ?pattern. (?text ?pattern) string:scrape ?path.
           ?f log:notEqualTo ?s }} => {{ ?s :path ?path }}."
    );
    // The ground fact is a premise of the file, not one of its conclusions; nor is the pair.
    assert_eq!(
        conclude(premises, &rules),
        vec![
            "<https://x.org/file/a.ts#make> <urn:a> <urn:EchoType>",
            "<https://x.org/file/a.ts#make> <urn:path> \"a.ts\""
        ]
    );
}

#[test]
fn string_builtins_read_patterns_from_the_data() {
    let store = NativeStore::in_memory(1000).unwrap();
    let glob = "urn:glob";
    store
        .insert_quads(&nquads(
            "urn:graph:a",
            &[
                (
                    file("packages/a/src/b.ts"),
                    "path",
                    "\"packages/a/src/b.ts\"".into(),
                ),
                (
                    file("packages/a/README.md"),
                    "path",
                    "\"packages/a/README.md\"".into(),
                ),
                (
                    glob.into(),
                    "pathPattern",
                    "\"^packages/(?:.*/)?src/(?:.*/)?[^/]*\\\\.ts$\"".into(),
                ),
                (glob.into(), "glob", "\"[unclosed\"".into()),
                (
                    symbol("src/op.ts", "Op"),
                    "literal",
                    "\"meta.key=org.dxos.operation.x\"".into(),
                ),
                (
                    symbol("src/op.ts", "Op"),
                    "literal",
                    "\"meta.name=X\"".into(),
                ),
            ],
        ))
        .unwrap();
    let strata = vec![Stratum {
        graph: format!("{DERIVED}builtins"),
        rules: r#"
            @prefix deus: <https://dxos.org/vocab/deus#>.
            @prefix log: <http://www.w3.org/2000/10/swap/log#>.
            @prefix string: <http://www.w3.org/2000/10/swap/string#>.
            { ?glob deus:pathPattern ?pattern. ?file deus:path ?path. ?path string:matches ?pattern }
              => { ?file deus:matchesGlob ?glob }.
            { ?glob deus:glob ?bad. ?file deus:path ?path. ?path string:matches ?bad }
              => { ?file deus:matchesBroken ?glob }.
            { ?op deus:literal ?literal. (?literal "^meta\\.key=(.*)$") string:scrape ?key }
              => { ?op deus:operationKey ?key }.
            { ?file deus:path ?path. ?path string:endsWith "/b.ts"; string:startsWith "packages/"; string:contains "/src/" }
              => { ?file deus:isSource true }.
            { ?a deus:path ?x. ?b deus:path ?y. ?a log:notEqualTo ?b } => { ?a deus:other ?b }.
        "#
        .into(),
    }];
    store.reason_all(&strata).unwrap();
    let (source, readme) = (file("packages/a/src/b.ts"), file("packages/a/README.md"));
    // An invalid pattern from the data matches nothing rather than failing the stratum.
    assert_eq!(
        derived(&store, &strata[0].graph),
        vec![
            format!("<{readme}> <{DEUS}other> <{source}>"),
            format!(
                "<{source}> <{DEUS}isSource> \"true\"^^<http://www.w3.org/2001/XMLSchema#boolean>"
            ),
            format!("<{source}> <{DEUS}matchesGlob> <{glob}>"),
            format!("<{source}> <{DEUS}other> <{readme}>"),
            format!(
                "<{}> <{DEUS}operationKey> \"org.dxos.operation.x\"",
                symbol("src/op.ts", "Op")
            ),
        ]
    );
}
