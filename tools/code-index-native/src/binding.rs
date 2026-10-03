//
// Copyright 2026 DXOS.org
//

//! The Node-API surface. Terms cross the boundary in N-Triples syntax and quads as N-Quads text,
//! which keeps the binding free of per-term object allocation on either side.

use std::str::FromStr;

use napi::{Error, Result};
use napi_derive::napi;
use oxigraph::model::{GraphName, NamedNode, NamedOrBlankNode, Term};

use crate::store;

/// The `graph` argument of `match` that names the default graph.
const DEFAULT_GRAPH: &str = "DEFAULT";

fn error(error: impl std::fmt::Display) -> Error {
    Error::from_reason(error.to_string())
}

fn term(text: &str) -> Result<Term> {
    Term::from_str(text).map_err(error)
}

#[napi(object)]
pub struct Stratum {
    pub graph: String,
    pub rules: String,
}

#[napi(object)]
pub struct Outcome {
    pub graph: String,
    pub derived: u32,
    pub added: u32,
    pub removed: u32,
    pub duration_ms: f64,
    pub incremental: bool,
}

#[napi(object)]
pub struct QueryResult {
    /// `results` (SPARQL JSON results) or `quads` (N-Triples).
    pub kind: String,
    pub body: String,
}

#[napi]
pub struct NativeStore {
    /// `None` once closed; RocksDB's directory lock is released when the store drops.
    store: Option<store::NativeStore>,
}

fn count(value: usize) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

#[napi]
impl NativeStore {
    /// Opens (creating if absent) the store rooted at `dir`.
    #[napi(factory)]
    pub fn open(dir: String) -> Result<Self> {
        Ok(Self {
            store: Some(store::NativeStore::open(dir).map_err(error)?),
        })
    }

    fn inner(&self) -> Result<&store::NativeStore> {
        self.store
            .as_ref()
            .ok_or_else(|| Error::from_reason("the native store is closed"))
    }

    /// Releases RocksDB's directory lock; every later call fails.
    #[napi]
    pub fn close(&mut self) {
        self.store = None;
    }

    #[napi]
    pub fn put_document(&self, graph: String, drop: Vec<String>, json_ld: String) -> Result<u32> {
        self.inner()?
            .put_document(&graph, &drop, &json_ld)
            .map(count)
            .map_err(error)
    }

    #[napi]
    pub fn drop_graphs(&self, graphs: Vec<String>) -> Result<()> {
        self.inner()?.drop_graphs(&graphs).map_err(error)
    }

    #[napi]
    pub fn insert_quads(&self, nquads: String) -> Result<()> {
        self.inner()?.insert_quads(&nquads).map_err(error)
    }

    #[napi]
    pub fn remove_quads(&self, nquads: String) -> Result<()> {
        self.inner()?.remove_quads(&nquads).map_err(error)
    }

    /// Quads matching the pattern, as N-Quads. A term is N-Triples syntax; `graph` may be `DEFAULT`.
    #[napi(js_name = "match")]
    pub fn match_quads(
        &self,
        subject: Option<String>,
        predicate: Option<String>,
        object: Option<String>,
        graph: Option<String>,
    ) -> Result<String> {
        let subject = match subject.as_deref().map(term).transpose()? {
            None => None,
            Some(Term::NamedNode(node)) => Some(NamedOrBlankNode::NamedNode(node)),
            Some(Term::BlankNode(node)) => Some(NamedOrBlankNode::BlankNode(node)),
            Some(Term::Literal(_)) => return Ok(String::new()),
        };
        let predicate = match predicate.as_deref().map(term).transpose()? {
            None => None,
            Some(Term::NamedNode(node)) => Some(node),
            Some(_) => return Ok(String::new()),
        };
        let object = object.as_deref().map(term).transpose()?;
        let graph = match graph.as_deref() {
            None => None,
            Some(DEFAULT_GRAPH) => Some(GraphName::DefaultGraph),
            Some(text) => match term(text)? {
                Term::NamedNode(node) => Some(GraphName::NamedNode(node)),
                Term::BlankNode(node) => Some(GraphName::BlankNode(node)),
                Term::Literal(_) => return Ok(String::new()),
            },
        };
        let quads = self
            .inner()?
            .match_quads(subject, predicate, object, graph)
            .map_err(error)?;
        store::NativeStore::to_nquads(&quads).map_err(error)
    }

    #[napi]
    pub fn query(&self, sparql: String) -> Result<QueryResult> {
        let (kind, body) = self.inner()?.query(&sparql).map_err(error)?;
        Ok(QueryResult {
            kind: kind.to_owned(),
            body,
        })
    }

    /// One rule file evaluated from nothing; returns its conclusions as N-Quads in `graph`.
    #[napi]
    pub fn reason(&self, graph: String, rules: String, materialize: bool) -> Result<String> {
        NamedNode::new(graph.as_str()).map_err(error)?;
        let quads = self
            .inner()?
            .reason(&graph, &rules, materialize)
            .map_err(error)?;
        store::NativeStore::to_nquads(&quads).map_err(error)
    }

    /// Every rule file in order, maintained incrementally where the stored state allows.
    #[napi]
    pub fn reason_all(&self, strata: Vec<Stratum>) -> Result<Vec<Outcome>> {
        let strata: Vec<store::Stratum> = strata
            .into_iter()
            .map(|stratum| store::Stratum {
                graph: stratum.graph,
                rules: stratum.rules,
            })
            .collect();
        let outcomes = self.inner()?.reason_all(&strata).map_err(error)?;
        Ok(outcomes
            .into_iter()
            .map(|outcome| Outcome {
                graph: outcome.graph,
                derived: count(outcome.derived),
                added: count(outcome.added),
                removed: count(outcome.removed),
                duration_ms: outcome.duration_ms,
                incremental: outcome.incremental,
            })
            .collect())
    }

    #[napi]
    pub fn quad_count(&self) -> Result<u32> {
        self.inner()?.quad_count().map(count).map_err(error)
    }

    #[napi]
    pub fn graph_length(&self, graph: String) -> Result<u32> {
        self.inner()?.graph_len(&graph).map(count).map_err(error)
    }

    #[napi]
    pub fn journal_length(&self) -> Result<u32> {
        Ok(count(self.inner()?.journal_len()))
    }

    #[napi]
    pub fn invalidate(&self) -> Result<()> {
        self.inner()?.invalidate().map_err(error)
    }

    #[napi]
    pub fn clear(&self) -> Result<()> {
        self.inner()?.clear().map_err(error)
    }
}
