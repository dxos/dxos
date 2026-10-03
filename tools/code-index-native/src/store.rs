//
// Copyright 2026 DXOS.org
//

//! The quad store (oxigraph over RocksDB) with journalled graph swaps, and the reasoning driver that
//! keeps each rule file's derived graph up to date from the journal.

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Instant;

use oxigraph::io::{RdfFormat, RdfParser, RdfSerializer};
use oxigraph::model::{
    GraphName, GraphNameRef, Literal, NamedNode, NamedNodeRef, NamedOrBlankNode, Quad, QuadRef,
    Term, Triple,
};
use oxigraph::sparql::results::{QueryResultsFormat, QueryResultsSerializer};
use oxigraph::sparql::{QueryResults, SparqlEvaluator};
use oxigraph::store::Store;
use rustc_hash::{FxHashMap, FxHashSet};

use crate::eval::{self, Change};
use crate::facts::{self, Dict, Facts, Id, Pattern, TripleSet};
use crate::rules::{self, RuleSet};
use crate::snapshot;

pub const DERIVED_PREFIX: &str = "https://dxos.org/deus/graph/derived/";

const ENGINE: &str = "urn:code-index:engine";
const SIGNATURE: &str = "urn:code-index:signature";
const OVERFLOW: &str = "urn:code-index:overflow";
/// The token the premises file was written under, recorded only once the run that wrote it commits.
const SNAPSHOT: &str = "urn:code-index:snapshot";
/// Journal entries record a triple's presence in the base *before* the first change since the last
/// reasoning pass: `(s, <prefix + p>, o)` in the journal store.
const WAS_PRESENT: &str = "urn:code-index:journal:present:";
const WAS_ABSENT: &str = "urn:code-index:journal:absent:";

/// Past this many journal entries a full recomputation is cheaper than maintenance (and a
/// `--force` reindex would otherwise double the cost of every commit).
pub const DEFAULT_JOURNAL_LIMIT: usize = 250_000;

#[derive(Debug)]
pub struct Error(pub String);

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for Error {}

macro_rules! impl_from {
    ($($source:ty),*) => {
        $(impl From<$source> for Error {
            fn from(error: $source) -> Self {
                Error(error.to_string())
            }
        })*
    };
}

impl_from!(
    oxigraph::store::StorageError,
    oxigraph::store::LoaderError,
    oxigraph::io::RdfParseError,
    oxigraph::io::RdfSyntaxError,
    oxigraph::sparql::QueryEvaluationError,
    oxigraph::sparql::SparqlSyntaxError,
    std::io::Error,
    rules::RuleError
);

pub type Result<T> = std::result::Result<T, Error>;

fn is_base_graph(graph: GraphNameRef<'_>) -> bool {
    match graph {
        GraphNameRef::NamedNode(node) => !node.as_str().starts_with(DERIVED_PREFIX),
        GraphNameRef::BlankNode(_) => true,
        GraphNameRef::DefaultGraph => true,
    }
}

fn journal_quad(triple: &Triple, was_present: bool) -> Quad {
    let prefix = if was_present { WAS_PRESENT } else { WAS_ABSENT };
    Quad::new(
        triple.subject.clone(),
        NamedNode::new_unchecked(format!("{prefix}{}", triple.predicate.as_str())),
        triple.object.clone(),
        GraphName::DefaultGraph,
    )
}

fn engine_quad(predicate: &str, value: Term) -> Quad {
    Quad::new(
        NamedNode::new_unchecked(ENGINE),
        NamedNode::new_unchecked(predicate),
        value,
        GraphName::DefaultGraph,
    )
}

#[derive(Default)]
struct JournalState {
    /// Whether commits are journalled: only once a signature exists and the journal has not overflowed.
    active: bool,
    entries: usize,
}

#[derive(Debug, Clone)]
pub struct Stratum {
    pub graph: String,
    pub rules: String,
}

/// One file's graph swap: `drop` is cleared and `triples` (N-Triples) land in `graph`.
#[derive(Debug, Clone)]
pub struct DocumentWrite {
    pub graph: String,
    pub drop: Vec<String>,
    pub triples: String,
}

#[derive(Debug, Clone)]
pub struct Outcome {
    pub graph: String,
    pub derived: usize,
    pub added: usize,
    pub removed: usize,
    pub duration_ms: f64,
    pub incremental: bool,
}

/// One snapshot thread's triples, over a dictionary of its own.
#[derive(Default)]
struct Part {
    ids: FxHashMap<Term, u32>,
    terms: Vec<Term>,
    triples: Vec<(u32, Id, u32)>,
}

impl Part {
    fn intern(&mut self, term: Term) -> u32 {
        if let Some(id) = self.ids.get(&term) {
            return *id;
        }
        let id = u32::try_from(self.terms.len()).expect("snapshot dictionary overflow");
        self.terms.push(term.clone());
        self.ids.insert(term, id);
        id
    }
}

pub struct NativeStore {
    store: Store,
    /// Engine bookkeeping, kept out of the main store so no query can see it: the journal, the rule
    /// set signature and the overflow flag. Written ahead of the change it describes, so it needs no
    /// transaction shared with the main store.
    meta: Store,
    journal: Mutex<JournalState>,
    journal_limit: usize,
    /// Where the premises of the last reasoning run are kept (`snapshot.rs`); none in memory.
    snapshot_path: Option<PathBuf>,
}

/// The file graphs, read through oxigraph's indexes and interned on the way out.
struct BaseFacts<'a> {
    store: &'a Store,
    dict: &'a Dict,
}

impl BaseFacts<'_> {
    /// The base quads matching the pattern; `None` when no quad can (a literal subject).
    fn lookup(&self, pattern: &Pattern) -> Option<impl Iterator<Item = Quad>> {
        let subject = self.subject(pattern[0]);
        let predicate = match pattern[1].map(|id| self.dict.term(id)) {
            Some(Term::NamedNode(node)) => Some(node),
            Some(_) => return None,
            None => None,
        };
        if pattern[0].is_some() && subject.is_none() {
            return None;
        }
        let object = pattern[2].map(|id| self.dict.term(id));
        let quads = self.store.quads_for_pattern(
            subject.as_ref().map(Into::into),
            predicate.as_ref().map(Into::into),
            object.as_ref().map(Into::into),
            None,
        );
        Some(
            quads
                .flatten()
                .filter(|quad| is_base_graph(quad.graph_name.as_ref())),
        )
    }

    /// Every matching triple until `sink` returns false.
    fn each(&self, pattern: &Pattern, sink: &mut dyn FnMut(facts::Triple) -> bool) {
        let Some(quads) = self.lookup(pattern) else {
            return;
        };
        for quad in quads {
            let s = pattern[0].unwrap_or_else(|| self.dict.intern(&quad.subject.into()));
            let p = pattern[1].unwrap_or_else(|| self.dict.intern(&quad.predicate.into()));
            let o = pattern[2].unwrap_or_else(|| self.dict.intern(&quad.object));
            if !sink([s, p, o]) {
                return;
            }
        }
    }

    fn subject(&self, id: Option<Id>) -> Option<NamedOrBlankNode> {
        id.and_then(|id| match self.dict.term(id) {
            Term::NamedNode(node) => Some(NamedOrBlankNode::NamedNode(node)),
            Term::BlankNode(node) => Some(NamedOrBlankNode::BlankNode(node)),
            Term::Literal(_) => None,
        })
    }
}

impl Facts for BaseFacts<'_> {
    fn scan(&self, pattern: &Pattern, sink: &mut dyn FnMut(facts::Triple)) {
        self.each(pattern, &mut |triple| {
            sink(triple);
            true
        });
    }

    fn estimate(&self, pattern: &Pattern, cap: usize) -> usize {
        self.lookup(pattern)
            .map_or(0, |quads| quads.take(cap).count())
    }

    fn contains(&self, triple: &facts::Triple) -> bool {
        self.lookup(&[Some(triple[0]), Some(triple[1]), Some(triple[2])])
            .is_some_and(|mut quads| quads.next().is_some())
    }
}

/// Several fact sources read as their union.
struct Layered<'a> {
    layers: Vec<&'a dyn Facts>,
}

impl Facts for Layered<'_> {
    fn scan(&self, pattern: &Pattern, sink: &mut dyn FnMut(facts::Triple)) {
        for layer in &self.layers {
            layer.scan(pattern, sink);
        }
    }

    fn contains(&self, triple: &facts::Triple) -> bool {
        self.layers.iter().any(|layer| layer.contains(triple))
    }

    fn estimate(&self, pattern: &Pattern, cap: usize) -> usize {
        self.layers
            .iter()
            .map(|layer| layer.estimate(pattern, cap))
            .sum::<usize>()
            .min(cap)
    }
}

/// Whether the triple is asserted in any base graph other than `except`.
fn in_base(store: &Store, triple: &Triple, except: &FxHashSet<GraphName>) -> Result<bool> {
    for quad in store.quads_for_pattern(
        Some(triple.subject.as_ref()),
        Some(triple.predicate.as_ref()),
        Some(triple.object.as_ref()),
        None,
    ) {
        let quad = quad?;
        if is_base_graph(quad.graph_name.as_ref()) && !except.contains(&quad.graph_name) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn signature(strata: &[Stratum]) -> String {
    // FNV-1a over the ordered (graph, rules) pairs: stable across runs and builds, unlike `Hash`.
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for stratum in strata {
        for byte in stratum
            .graph
            .bytes()
            .chain([0])
            .chain(stratum.rules.bytes())
            .chain([0])
        {
            hash ^= u64::from(byte);
            hash = hash.wrapping_mul(0x0100_0000_01b3);
        }
    }
    format!("{hash:016x}")
}

impl NativeStore {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref();
        std::fs::create_dir_all(path)?;
        Self::from_stores(
            Store::open(path.join("oxigraph"))?,
            Store::open(path.join("journal"))?,
            DEFAULT_JOURNAL_LIMIT,
            Some(path.join("premises.bin")),
        )
    }

    pub fn in_memory(journal_limit: usize) -> Result<Self> {
        Self::from_stores(Store::new()?, Store::new()?, journal_limit, None)
    }

    fn from_stores(
        store: Store,
        meta: Store,
        journal_limit: usize,
        snapshot_path: Option<PathBuf>,
    ) -> Result<Self> {
        let native = Self {
            store,
            meta,
            journal: Mutex::new(JournalState::default()),
            journal_limit,
            snapshot_path,
        };
        native.reload_journal_state()?;
        Ok(native)
    }

    fn reload_journal_state(&self) -> Result<()> {
        let signed = self.engine_value(SIGNATURE)?.is_some();
        let overflowed = self.engine_value(OVERFLOW)?.is_some();
        let entries = self.journal_quads()?.len();
        let mut journal = self
            .journal
            .lock()
            .map_err(|_| Error("journal lock poisoned".into()))?;
        journal.active = signed && !overflowed;
        journal.entries = entries;
        Ok(())
    }

    fn engine_value(&self, predicate: &str) -> Result<Option<Term>> {
        let quad = self
            .meta
            .quads_for_pattern(
                Some(NamedNodeRef::new_unchecked(ENGINE).into()),
                Some(NamedNodeRef::new_unchecked(predicate)),
                None,
                None,
            )
            .next()
            .transpose()?;
        Ok(quad.map(|quad| quad.object))
    }

    fn set_engine_value(&self, predicate: &str, value: Option<Term>) -> Result<()> {
        let mut transaction = self.meta.start_transaction()?;
        if let Some(current) = self.engine_value(predicate)? {
            transaction.remove(&engine_quad(predicate, current));
        }
        if let Some(value) = value {
            transaction.insert(&engine_quad(predicate, value));
        }
        transaction.commit()?;
        Ok(())
    }

    fn journal_quads(&self) -> Result<Vec<Quad>> {
        let mut quads = Vec::new();
        for quad in self.meta.quads_for_pattern(None, None, None, None) {
            let quad = quad?;
            let predicate = quad.predicate.as_str();
            if predicate.starts_with(WAS_PRESENT) || predicate.starts_with(WAS_ABSENT) {
                quads.push(quad);
            }
        }
        Ok(quads)
    }

    /// Replaces the contents of `drop` (any number of base graphs) with `quads`. Before anything is
    /// written, every triple whose presence in the base it changes is journalled with its presence
    /// beforehand — unless the journal already has it, since the oldest entry is the one that
    /// describes the state the derived graphs were computed from. A journal entry for a swap that
    /// never completes is harmless: reasoning compares it with the triple's actual presence.
    ///
    /// The new quads go in through the bulk loader, an order of magnitude faster than a transaction,
    /// and only then are the stale ones removed, in one transaction: a reader may see both revisions
    /// for a moment, never neither. Atomicity is the ledger's job (`pending_graph`): a swap cut
    /// short leaves graphs that `reconcile` drops.
    fn swap(&self, drop: &[GraphName], quads: Vec<Quad>) -> Result<()> {
        let mut journal = self
            .journal
            .lock()
            .map_err(|_| Error("journal lock poisoned".into()))?;
        let touched: FxHashSet<GraphName> = drop
            .iter()
            .cloned()
            .chain(quads.iter().map(|quad| quad.graph_name.clone()))
            .collect();
        let mut old = Vec::new();
        for graph in &touched {
            for quad in self
                .store
                .quads_for_pattern(None, None, None, Some(graph.as_ref()))
            {
                old.push(quad?);
            }
        }
        if journal.active {
            let old_triples: FxHashSet<Triple> =
                old.iter().map(|quad| Triple::from(quad.clone())).collect();
            let new_triples: FxHashSet<Triple> = quads
                .iter()
                .map(|quad| Triple::from(quad.clone()))
                .collect();
            let mut entries = Vec::new();
            // Arriving: absent before unless another base graph already asserted it.
            for triple in new_triples.difference(&old_triples) {
                if !in_base(&self.store, triple, &touched)? {
                    entries.push((triple.clone(), false));
                }
            }
            // Leaving: present before; gone after unless another base graph still asserts it.
            for triple in old_triples.difference(&new_triples) {
                if !in_base(&self.store, triple, &touched)? {
                    entries.push((triple.clone(), true));
                }
            }
            let mut transaction = self.meta.start_transaction()?;
            let mut written = 0;
            for (triple, was_present) in &entries {
                let entry = journal_quad(triple, *was_present);
                if !transaction.contains(&entry)?
                    && !transaction.contains(&journal_quad(triple, !was_present))?
                {
                    transaction.insert(&entry);
                    written += 1;
                }
            }
            if journal.entries + written > self.journal_limit {
                transaction.insert(&engine_quad(OVERFLOW, Literal::from(true).into()));
                journal.active = false;
            }
            transaction.commit()?;
            journal.entries += written;
        }
        if !quads.is_empty() {
            let mut loader = self.store.bulk_loader().with_num_threads(1);
            loader.load_quads(quads.iter().cloned())?;
            loader.commit()?;
        }
        let kept: FxHashSet<&Quad> = quads.iter().collect();
        let stale: Vec<&Quad> = old.iter().filter(|quad| !kept.contains(quad)).collect();
        if !stale.is_empty() {
            let mut transaction = self.store.start_transaction()?;
            for quad in stale {
                transaction.remove(quad);
            }
            transaction.commit()?;
        }
        Ok(())
    }

    /// Replaces `drop` with quads in N-Quads form, homed in `graph` (their own graph is ignored).
    pub fn put_document_nquads(&self, graph: &str, drop: &[String], nquads: &str) -> Result<usize> {
        let graph = NamedNode::new(graph).map_err(|error| Error(error.to_string()))?;
        let quads: Vec<Quad> = Self::parse_nquads(nquads)?
            .into_iter()
            .map(|quad| Quad::new(quad.subject, quad.predicate, quad.object, graph.clone()))
            .collect();
        let count = quads.len();
        let mut graphs: Vec<GraphName> = drop
            .iter()
            .map(|name| NamedNode::new_unchecked(name.as_str()).into())
            .collect();
        graphs.push(graph.into());
        self.swap(&graphs, quads)?;
        Ok(count)
    }

    /// Several documents' swaps as one write: the bulk loader's cost per quad falls with the size
    /// of the load, so the indexer hands over hundreds of files at a time.
    pub fn put_documents(&self, writes: &[DocumentWrite]) -> Result<usize> {
        let mut graphs: Vec<GraphName> = Vec::new();
        let mut quads = Vec::new();
        for write in writes {
            let graph =
                NamedNode::new(write.graph.as_str()).map_err(|error| Error(error.to_string()))?;
            // Lenient: the indexer minted and escaped these terms (`internal/iri.ts`), and validating
            // every IRI again would cost the commit time for nothing.
            for quad in RdfParser::from_format(RdfFormat::NTriples)
                .lenient()
                .for_slice(&write.triples)
            {
                let quad = quad?;
                quads.push(Quad::new(
                    quad.subject,
                    quad.predicate,
                    quad.object,
                    graph.clone(),
                ));
            }
            graphs.extend(
                write
                    .drop
                    .iter()
                    .map(|name| GraphName::from(NamedNode::new_unchecked(name.as_str()))),
            );
            graphs.push(graph.into());
        }
        let count = quads.len();
        self.swap(&graphs, quads)?;
        Ok(count)
    }

    pub fn drop_graphs(&self, graphs: &[String]) -> Result<()> {
        let graphs: Vec<GraphName> = graphs
            .iter()
            .map(|name| NamedNode::new_unchecked(name.as_str()).into())
            .collect();
        self.swap(&graphs, Vec::new())
    }

    fn parse_nquads(nquads: &str) -> Result<Vec<Quad>> {
        let mut quads = Vec::new();
        for quad in RdfParser::from_format(RdfFormat::NQuads).for_slice(nquads) {
            quads.push(quad?);
        }
        Ok(quads)
    }

    /// Raw writes. Base writes are journalled; writes into a derived graph invalidate the engine state.
    pub fn insert_quads(&self, nquads: &str) -> Result<()> {
        self.raw(Self::parse_nquads(nquads)?, true)
    }

    pub fn remove_quads(&self, nquads: &str) -> Result<()> {
        self.raw(Self::parse_nquads(nquads)?, false)
    }

    fn raw(&self, quads: Vec<Quad>, insert: bool) -> Result<()> {
        let (base, derived): (Vec<Quad>, Vec<Quad>) = quads
            .into_iter()
            .partition(|quad| is_base_graph(quad.graph_name.as_ref()));
        if !derived.is_empty() {
            // Invalidated first: a crash after the write must not leave a signature vouching for it.
            self.invalidate()?;
            let mut transaction = self.store.start_transaction()?;
            for quad in &derived {
                if insert {
                    transaction.insert(quad);
                } else {
                    transaction.remove(quad);
                }
            }
            transaction.commit()?;
        }
        if base.is_empty() {
            return Ok(());
        }
        let graphs: Vec<GraphName> = base
            .iter()
            .map(|quad| quad.graph_name.clone())
            .collect::<FxHashSet<_>>()
            .into_iter()
            .collect();
        let mut next: FxHashSet<Quad> = FxHashSet::default();
        for graph in &graphs {
            for quad in self
                .store
                .quads_for_pattern(None, None, None, Some(graph.as_ref()))
            {
                next.insert(quad?);
            }
        }
        for quad in base {
            if insert {
                next.insert(quad);
            } else {
                next.remove(&quad);
            }
        }
        self.swap(&graphs, next.into_iter().collect())
    }

    /// Forgets the engine state: the next `reason_all` recomputes from nothing.
    pub fn invalidate(&self) -> Result<()> {
        self.meta.clear()?;
        self.reload_journal_state()
    }

    pub fn match_quads(
        &self,
        subject: Option<NamedOrBlankNode>,
        predicate: Option<NamedNode>,
        object: Option<Term>,
        graph: Option<GraphName>,
    ) -> Result<Vec<Quad>> {
        let mut quads = Vec::new();
        for quad in self.store.quads_for_pattern(
            subject.as_ref().map(Into::into),
            predicate.as_ref().map(Into::into),
            object.as_ref().map(Into::into),
            graph.as_ref().map(Into::into),
        ) {
            quads.push(quad?);
        }
        Ok(quads)
    }

    pub fn quad_count(&self) -> Result<usize> {
        Ok(self.store.len()?)
    }

    /// Quads in one named graph, counted here so none is serialised across the binding.
    pub fn graph_len(&self, graph: &str) -> Result<usize> {
        let graph = NamedNode::new(graph).map_err(|error| Error(error.to_string()))?;
        let mut count = 0;
        for quad in self
            .store
            .quads_for_pattern(None, None, None, Some(graph.as_ref().into()))
        {
            quad?;
            count += 1;
        }
        Ok(count)
    }

    pub fn clear(&self) -> Result<()> {
        self.store.clear()?;
        self.meta.clear()?;
        self.reload_journal_state()
    }

    /// Runs SPARQL with the default graph as the union of all graphs. Returns `(kind, body)`:
    /// SPARQL JSON results for SELECT/ASK, N-Triples for CONSTRUCT/DESCRIBE.
    pub fn query(&self, sparql: &str) -> Result<(&'static str, String)> {
        let mut prepared = SparqlEvaluator::new().parse_query(sparql)?;
        prepared.dataset_mut().set_default_graph_as_union();
        match prepared.on_store(&self.store).execute()? {
            QueryResults::Graph(triples) => {
                let mut serializer =
                    RdfSerializer::from_format(RdfFormat::NTriples).for_writer(Vec::new());
                for triple in triples {
                    serializer.serialize_triple(&triple?)?;
                }
                Ok((
                    "quads",
                    String::from_utf8_lossy(&serializer.finish()?).into_owned(),
                ))
            }
            results @ (QueryResults::Solutions(_) | QueryResults::Boolean(_)) => {
                let mut out = Vec::new();
                let serializer = QueryResultsSerializer::from_format(QueryResultsFormat::Json);
                match results {
                    QueryResults::Boolean(value) => {
                        serializer.serialize_boolean_to_writer(&mut out, value)?;
                    }
                    QueryResults::Solutions(solutions) => {
                        let mut writer = serializer.serialize_solutions_to_writer(
                            &mut out,
                            solutions.variables().to_vec(),
                        )?;
                        for solution in solutions {
                            writer.serialize(&solution?)?;
                        }
                        writer.finish()?;
                    }
                    QueryResults::Graph(_) => unreachable!(),
                }
                Ok(("results", String::from_utf8_lossy(&out).into_owned()))
            }
        }
    }

    /// The base triples with these predicates.
    ///
    /// Decoding a quad is a RocksDB read per non-inline term, which made this load most of a warm
    /// pass; so predicates are decoded on every core, each thread interning into a dictionary of its
    /// own that is merged into `dict` once per distinct term.
    fn snapshot(&self, predicates: &FxHashSet<Id>, dict: &Dict) -> Result<TripleSet> {
        let predicates: Vec<(Id, NamedNode)> = predicates
            .iter()
            .filter_map(|id| match dict.term(*id) {
                Term::NamedNode(node) => Some((*id, node)),
                _ => None,
            })
            .collect();
        let next = AtomicUsize::new(0);
        let threads = std::thread::available_parallelism().map_or(1, |count| count.get());
        let parts: Vec<Result<Part>> = std::thread::scope(|scope| {
            let workers: Vec<_> = (0..threads.min(predicates.len()))
                .map(|_| {
                    scope.spawn(|| {
                        let mut part = Part::default();
                        while let Some((predicate, node)) =
                            predicates.get(next.fetch_add(1, Ordering::Relaxed))
                        {
                            for quad in
                                self.store
                                    .quads_for_pattern(None, Some(node.as_ref()), None, None)
                            {
                                let quad = quad?;
                                if is_base_graph(quad.graph_name.as_ref()) {
                                    let subject = part.intern(quad.subject.into());
                                    let object = part.intern(quad.object);
                                    part.triples.push((subject, *predicate, object));
                                }
                            }
                        }
                        Ok(part)
                    })
                })
                .collect();
            workers
                .into_iter()
                .map(|worker| worker.join().expect("snapshot thread panicked"))
                .collect()
        });
        let mut set = TripleSet::default();
        for part in parts {
            let part = part?;
            let ids: Vec<Id> = part.terms.iter().map(|term| dict.intern(term)).collect();
            for (subject, predicate, object) in part.triples {
                set.insert([ids[subject as usize], predicate, ids[object as usize]]);
            }
        }
        Ok(set)
    }

    fn graph_set(&self, graph: &str, dict: &Dict) -> Result<TripleSet> {
        let mut set = TripleSet::default();
        for quad in self.store.quads_for_pattern(
            None,
            None,
            None,
            Some(NamedNodeRef::new_unchecked(graph).into()),
        ) {
            let quad = quad?;
            set.insert([
                dict.intern(&quad.subject.into()),
                dict.intern(&quad.predicate.into()),
                dict.intern(&quad.object),
            ]);
        }
        Ok(set)
    }

    fn quad_of(dict: &Dict, triple: &facts::Triple, graph: &NamedNode) -> Option<Quad> {
        // A list term lives only inside one engine run.
        if triple.iter().any(|id| dict.is_list(*id)) {
            return None;
        }
        let subject = match dict.term(triple[0]) {
            Term::NamedNode(node) => NamedOrBlankNode::NamedNode(node),
            Term::BlankNode(node) => NamedOrBlankNode::BlankNode(node),
            Term::Literal(_) => return None,
        };
        let Term::NamedNode(predicate) = dict.term(triple[1]) else {
            return None;
        };
        Some(Quad::new(
            subject,
            predicate,
            dict.term(triple[2]),
            graph.clone(),
        ))
    }

    /// One rule file over the base and every *other* derived graph, from nothing — the contract of
    /// the JS backend's `reason`. Returns the conclusions not already among the premises.
    pub fn reason(&self, graph: &str, rules_text: &str, materialize: bool) -> Result<Vec<Quad>> {
        let dict = Dict::default();
        let rules = rules::compile(rules_text, &dict)?;
        let base = BaseFacts {
            store: &self.store,
            dict: &dict,
        };
        let mut others = TripleSet::default();
        for name in self.store.named_graphs() {
            if let NamedOrBlankNode::NamedNode(name) = name?
                && name.as_str().starts_with(DERIVED_PREFIX)
                && name.as_str() != graph
            {
                for triple in self.graph_set(name.as_str(), &dict)?.iter() {
                    others.insert(*triple);
                }
            }
        }
        let base = facts::Cached::new(&base);
        let premises = Layered {
            layers: vec![&base, &others, &rules.axioms],
        };
        let derived = eval::full(&rules, &premises, &dict);
        let graph_node = NamedNode::new_unchecked(graph);
        let quads: Vec<Quad> = derived
            .iter()
            .filter(|triple| !premises.contains(triple))
            .filter_map(|triple| Self::quad_of(&dict, triple, &graph_node))
            .collect();
        if materialize {
            self.invalidate()?;
            let mut transaction = self.store.start_transaction()?;
            let stale: Vec<Quad> = transaction
                .quads_for_pattern(None, None, None, Some(graph_node.as_ref().into()))
                .collect::<std::result::Result<_, _>>()?;
            for quad in &stale {
                transaction.remove(quad);
            }
            for quad in &quads {
                transaction.insert(quad);
            }
            transaction.commit()?;
        }
        Ok(quads)
    }

    /// Every stratum in order, each maintained from the journal when the stored state was computed by
    /// this exact rule set, else recomputed. All derived-graph writes, the journal reset and the new
    /// signature land in one transaction.
    pub fn reason_all(&self, strata: &[Stratum]) -> Result<Vec<Outcome>> {
        let dict = Dict::default();
        let compiled: Vec<RuleSet> = strata
            .iter()
            .map(|stratum| rules::compile(&stratum.rules, &dict))
            .collect::<std::result::Result<_, _>>()?;
        let signature = signature(strata);
        let incremental = matches!(self.engine_value(SIGNATURE)?, Some(Term::Literal(value)) if value.value() == signature)
            && self.engine_value(OVERFLOW)?.is_none();

        // The base change since the last run, from the journal.
        let mut plus = TripleSet::default();
        let mut minus = TripleSet::default();
        let journal = self.journal_quads()?;
        if incremental {
            let base = BaseFacts {
                store: &self.store,
                dict: &dict,
            };
            for quad in &journal {
                let was_present = quad.predicate.as_str().starts_with(WAS_PRESENT);
                let prefix = if was_present { WAS_PRESENT } else { WAS_ABSENT };
                let predicate = Term::NamedNode(NamedNode::new_unchecked(
                    &quad.predicate.as_str()[prefix.len()..],
                ));
                let triple = [
                    dict.intern(&quad.subject.clone().into()),
                    dict.intern(&predicate),
                    dict.intern(&quad.object),
                ];
                // The entry is the presence before; the store is the presence now. Equal means the
                // change was undone, or never committed.
                match (was_present, base.contains(&triple)) {
                    (false, true) => {
                        plus.insert(triple);
                    }
                    (true, false) => {
                        minus.insert(triple);
                    }
                    _ => {}
                }
            }
        }

        let stored_base = BaseFacts {
            store: &self.store,
            dict: &dict,
        };
        // Every base fact the rules can read, loaded once: a join then probes a hash index rather
        // than seeking RocksDB and re-interning what it finds, which dominated reasoning.
        let snapshot = match compiled
            .iter()
            .map(|rules| rules.predicates.as_ref())
            .collect::<Option<Vec<_>>>()
        {
            Some(sets) => {
                let predicates: FxHashSet<Id> = sets.into_iter().flatten().copied().collect();
                let kept = if incremental {
                    self.kept_premises(&dict)
                } else {
                    None
                };
                Some(match kept {
                    // The kept premises plus the journal's changes are the base now: every base
                    // write since that run is journalled, or the run would not be incremental.
                    Some(mut kept) => {
                        for triple in plus.iter().filter(|triple| predicates.contains(&triple[1])) {
                            kept.insert(*triple);
                        }
                        for triple in minus.iter() {
                            kept.remove(triple);
                        }
                        kept
                    }
                    None => self.snapshot(&predicates, &dict)?,
                })
            }
            None => None,
        };
        // Without a snapshot, an unbound scan is still decoded from the store only once.
        let cached_base = facts::Cached::new(&stored_base);
        let base: &dyn Facts = match &snapshot {
            Some(snapshot) => snapshot,
            None => &cached_base,
        };
        let before_base = facts::Before {
            after: base,
            plus: &plus,
            minus: &minus,
        };
        let mut materialised: Vec<TripleSet> = Vec::new();
        let mut changes: Vec<Change> = Vec::new();
        let mut previous: Vec<TripleSet> = Vec::new();
        let mut outcomes = Vec::new();

        for (stratum, rules) in strata.iter().zip(&compiled) {
            let started = Instant::now();
            let stored = self.graph_set(&stratum.graph, &dict)?;
            let mut layers: Vec<&dyn Facts> = vec![base];
            layers.extend(materialised.iter().map(|set| set as &dyn Facts));
            // The file's own ground facts are its premises alone, never its output.
            layers.push(&rules.axioms);
            let premises = Layered { layers };
            // A stratum that proves on demand or aggregates is recomputed: DRed cannot see through it.
            let maintained = incremental && rules.maintainable;

            let (derived, change) = if maintained {
                // This stratum's premises changed where the base or an earlier stratum did, unless
                // another layer still (or already) asserts the triple.
                let mut before_layers: Vec<&dyn Facts> = vec![&before_base];
                before_layers.extend(previous.iter().map(|set| set as &dyn Facts));
                before_layers.push(&rules.axioms);
                let before = Layered {
                    layers: before_layers,
                };
                let mut stratum_plus = TripleSet::default();
                let mut stratum_minus = TripleSet::default();
                let candidates = plus.iter().chain(minus.iter()).chain(
                    changes
                        .iter()
                        .flat_map(|change| change.added.iter().chain(change.removed.iter())),
                );
                let mut seen = FxHashSet::default();
                for triple in candidates {
                    if !seen.insert(*triple) {
                        continue;
                    }
                    match (before.contains(triple), premises.contains(triple)) {
                        (false, true) => {
                            stratum_plus.insert(*triple);
                        }
                        (true, false) => {
                            stratum_minus.insert(*triple);
                        }
                        _ => {}
                    }
                }
                let mut derived = stored.clone();
                let change = eval::maintain(
                    rules,
                    &premises,
                    &stratum_plus,
                    &stratum_minus,
                    &mut derived,
                    &dict,
                );
                (derived, change)
            } else {
                let derived = eval::full(rules, &premises, &dict);
                let change = Change {
                    added: derived
                        .iter()
                        .filter(|triple| !stored.contains(triple))
                        .copied()
                        .collect(),
                    removed: stored
                        .iter()
                        .filter(|triple| !derived.contains(triple))
                        .copied()
                        .collect(),
                };
                (derived, change)
            };
            drop(premises);
            outcomes.push(Outcome {
                graph: stratum.graph.clone(),
                derived: derived.len(),
                added: change.added.len(),
                removed: change.removed.len(),
                duration_ms: started.elapsed().as_secs_f64() * 1000.0,
                incremental: maintained,
            });
            previous.push(stored);
            materialised.push(derived);
            changes.push(change);
        }

        // Three steps across two stores, ordered so a crash anywhere leaves either the old state with
        // its journal, or no signature (and so a full recomputation next time) — never new derived
        // graphs paired with a journal that would be replayed against them.
        self.set_engine_value(SIGNATURE, None)?;
        let mut transaction = self.store.start_transaction()?;
        for (stratum, change) in strata.iter().zip(&changes) {
            let graph = NamedNode::new_unchecked(stratum.graph.as_str());
            for triple in &change.removed {
                if let Some(quad) = Self::quad_of(&dict, triple, &graph) {
                    transaction.remove(&quad);
                }
            }
            for triple in &change.added {
                if let Some(quad) = Self::quad_of(&dict, triple, &graph) {
                    transaction.insert(&quad);
                }
            }
        }
        transaction.commit()?;
        let kept = snapshot
            .as_ref()
            .and_then(|snapshot| self.keep_premises(snapshot, &signature, &dict));
        self.meta.clear()?;
        self.set_engine_value(
            SIGNATURE,
            Some(Literal::new_simple_literal(signature).into()),
        )?;
        if let Some(token) = kept {
            self.set_engine_value(SNAPSHOT, Some(Literal::new_simple_literal(token).into()))?;
        }
        self.reload_journal_state()?;
        Ok(outcomes)
    }

    /// The premises the last run kept, if the engine state still vouches for them. A file that cannot
    /// be read is only a lost shortcut: the caller decodes the premises from the store instead.
    fn kept_premises(&self, dict: &Dict) -> Option<TripleSet> {
        let path = self.snapshot_path.as_ref()?;
        let Ok(Some(Term::Literal(token))) = self.engine_value(SNAPSHOT) else {
            return None;
        };
        snapshot::read(path, token.value(), dict).ok().flatten()
    }

    /// Writes `premises` for the next run and returns the token to record once this run commits;
    /// `None` if there is nowhere to write or the write failed, which costs the next run a decode.
    fn keep_premises(&self, premises: &TripleSet, signature: &str, dict: &Dict) -> Option<String> {
        let path = self.snapshot_path.as_ref()?;
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |elapsed| elapsed.as_nanos());
        let token = format!("{signature}:{nanos}");
        match snapshot::write(path, &token, premises, dict) {
            Ok(()) => Some(token),
            Err(_) => {
                let _ = std::fs::remove_file(path);
                None
            }
        }
    }

    /// Serialises quads as N-Quads.
    pub fn to_nquads(quads: &[Quad]) -> Result<String> {
        let mut serializer = RdfSerializer::from_format(RdfFormat::NQuads).for_writer(Vec::new());
        for quad in quads {
            serializer.serialize_quad(QuadRef::from(quad))?;
        }
        Ok(String::from_utf8_lossy(&serializer.finish()?).into_owned())
    }

    /// Journal entries awaiting the next reasoning pass.
    pub fn journal_len(&self) -> usize {
        self.journal
            .lock()
            .map(|journal| journal.entries)
            .unwrap_or_default()
    }
}
