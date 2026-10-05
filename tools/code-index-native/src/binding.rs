//
// Copyright 2026 DXOS.org
//

//! The Node-API surface. Terms cross the boundary in N-Triples syntax and quads as N-Quads text,
//! which keeps the binding free of per-term object allocation on either side.

use std::str::FromStr;
use std::sync::Arc;

use napi::bindgen_prelude::{AsyncTask, ToNapiValue, TypeName};
use napi::{Env, Error, Result, Task};
use napi_derive::napi;
use oxigraph::model::{GraphName, NamedNode, NamedOrBlankNode, Quad, Term};
use oxigraph::sparql::CancellationToken;

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
pub struct DocumentWrite {
    pub graph: String,
    pub drop: Vec<String>,
    /// N-Triples; every triple lands in `graph`.
    pub triples: String,
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
    store: Option<Arc<store::NativeStore>>,
}

/// A batch's graph swap on a libuv thread, so the event loop keeps handing parsed batches out while
/// RocksDB writes.
pub struct PutDocuments {
    store: Arc<store::NativeStore>,
    writes: Vec<store::DocumentWrite>,
}

impl Task for PutDocuments {
    type Output = usize;
    type JsValue = u32;

    fn compute(&mut self) -> Result<usize> {
        self.store.put_documents(&self.writes).map_err(error)
    }

    fn resolve(&mut self, _env: Env, output: usize) -> Result<u32> {
        Ok(count(output))
    }
}

/// A query on a libuv thread, so a slow one neither blocks the event loop nor other queries.
pub struct Query {
    store: Arc<store::NativeStore>,
    sparql: String,
    token: CancellationToken,
}

impl Task for Query {
    type Output = (&'static str, String);
    type JsValue = QueryResult;

    fn compute(&mut self) -> Result<Self::Output> {
        self.store
            .query_cancellable(&self.sparql, self.token.clone())
            .map_err(error)
    }

    fn resolve(&mut self, _env: Env, (kind, body): Self::Output) -> Result<QueryResult> {
        Ok(QueryResult {
            kind: kind.to_owned(),
            body,
        })
    }
}

/// Any other store call on a libuv thread: on a large store each can hold the thread for seconds,
/// which on the event loop would stall every request the process serves.
pub struct Blocking<T> {
    work: Option<Box<dyn FnOnce() -> Result<T> + Send>>,
}

impl<T: ToNapiValue + TypeName + Send + 'static> Task for Blocking<T> {
    type Output = T;
    type JsValue = T;

    fn compute(&mut self) -> Result<T> {
        let work = self
            .work
            .take()
            .ok_or_else(|| Error::from_reason("the task already ran"))?;
        work()
    }

    fn resolve(&mut self, _env: Env, output: T) -> Result<T> {
        Ok(output)
    }
}

fn blocking<T>(work: impl FnOnce() -> Result<T> + Send + 'static) -> AsyncTask<Blocking<T>>
where
    T: ToNapiValue + TypeName + Send + 'static,
{
    AsyncTask::new(Blocking {
        work: Some(Box::new(work)),
    })
}

/// The hash of the crate sources this addon was built from (see `build.rs`), which the CLI checks
/// against the sources on disk.
#[napi]
pub fn sources_hash() -> String {
    env!("CODE_INDEX_SOURCES").to_string()
}

/// Cancels the queries it was passed to; each stops at the next quad it reads.
#[napi]
pub struct QueryCancel {
    token: CancellationToken,
}

#[napi]
impl QueryCancel {
    #[napi(constructor)]
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            token: CancellationToken::new(),
        }
    }

    #[napi]
    pub fn cancel(&self) {
        self.token.cancel();
    }
}

fn count(value: usize) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

#[napi]
impl NativeStore {
    /// Opens (creating if absent) the store rooted at `dir`, sharing it with every other handle this
    /// process holds on the same directory, whichever thread or worker opened that one.
    #[napi(factory)]
    pub fn open(dir: String) -> Result<Self> {
        Ok(Self {
            store: Some(store::NativeStore::open_shared(dir).map_err(error)?),
        })
    }

    fn inner(&self) -> Result<&Arc<store::NativeStore>> {
        self.store
            .as_ref()
            .ok_or_else(|| Error::from_reason("the native store is closed"))
    }

    /// Releases this handle; RocksDB's directory lock goes once no other handle or call in flight
    /// (each holds the store) remains. Every later call on this handle fails.
    #[napi]
    pub fn close(&mut self) {
        self.store = None;
    }

    /// Resolves once the batch is written; a write in flight keeps the store open until it finishes.
    #[napi(ts_return_type = "Promise<number>")]
    pub fn put_documents(&self, writes: Vec<DocumentWrite>) -> Result<AsyncTask<PutDocuments>> {
        let writes: Vec<store::DocumentWrite> = writes
            .into_iter()
            .map(|write| store::DocumentWrite {
                graph: write.graph,
                drop: write.drop,
                triples: write.triples,
            })
            .collect();
        Ok(AsyncTask::new(PutDocuments {
            store: Arc::clone(self.inner()?),
            writes,
        }))
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn drop_graphs(&self, graphs: Vec<String>) -> Result<AsyncTask<Blocking<()>>> {
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || store.drop_graphs(&graphs).map_err(error)))
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn insert_quads(&self, nquads: String) -> Result<AsyncTask<Blocking<()>>> {
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || store.insert_quads(&nquads).map_err(error)))
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn remove_quads(&self, nquads: String) -> Result<AsyncTask<Blocking<()>>> {
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || store.remove_quads(&nquads).map_err(error)))
    }

    /// Quads matching the pattern, as `QUAD_ROW` strings each (see `rows`). A term is N-Triples
    /// syntax; `graph` may be `DEFAULT`.
    #[napi(js_name = "match", ts_return_type = "Promise<string[]>")]
    pub fn match_quads(
        &self,
        subject: Option<String>,
        predicate: Option<String>,
        object: Option<String>,
        graph: Option<String>,
    ) -> Result<AsyncTask<Blocking<Vec<String>>>> {
        let none = || Ok(blocking(|| Ok(Vec::new())));
        let subject = match subject.as_deref().map(term).transpose()? {
            None => None,
            Some(Term::NamedNode(node)) => Some(NamedOrBlankNode::NamedNode(node)),
            Some(Term::BlankNode(node)) => Some(NamedOrBlankNode::BlankNode(node)),
            Some(Term::Literal(_)) => return none(),
        };
        let predicate = match predicate.as_deref().map(term).transpose()? {
            None => None,
            Some(Term::NamedNode(node)) => Some(node),
            Some(_) => return none(),
        };
        let object = object.as_deref().map(term).transpose()?;
        let graph = match graph.as_deref() {
            None => None,
            Some(DEFAULT_GRAPH) => Some(GraphName::DefaultGraph),
            Some(text) => match term(text)? {
                Term::NamedNode(node) => Some(GraphName::NamedNode(node)),
                Term::BlankNode(node) => Some(GraphName::BlankNode(node)),
                Term::Literal(_) => return none(),
            },
        };
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || {
            let quads = store
                .match_quads(subject, predicate, object, graph)
                .map_err(error)?;
            Ok(rows(&quads))
        }))
    }

    /// Runs off the event loop; `cancel` aborts it, after which it rejects with a `cancelled` error.
    #[napi(ts_return_type = "Promise<QueryResult>")]
    pub fn query(&self, sparql: String, cancel: &QueryCancel) -> Result<AsyncTask<Query>> {
        Ok(AsyncTask::new(Query {
            store: Arc::clone(self.inner()?),
            sparql,
            token: cancel.token.clone(),
        }))
    }

    /// One rule file evaluated from nothing; resolves to its conclusions as N-Quads in `graph`.
    #[napi(ts_return_type = "Promise<string>")]
    pub fn reason(
        &self,
        graph: String,
        rules: String,
        materialize: bool,
    ) -> Result<AsyncTask<Blocking<String>>> {
        NamedNode::new(graph.as_str()).map_err(error)?;
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || {
            let quads = store.reason(&graph, &rules, materialize).map_err(error)?;
            store::NativeStore::to_nquads(&quads).map_err(error)
        }))
    }

    /// Every rule file in order, maintained incrementally where the stored state allows.
    #[napi(ts_return_type = "Promise<Outcome[]>")]
    pub fn reason_all(&self, strata: Vec<Stratum>) -> Result<AsyncTask<Blocking<Vec<Outcome>>>> {
        let strata: Vec<store::Stratum> = strata
            .into_iter()
            .map(|stratum| store::Stratum {
                graph: stratum.graph,
                rules: stratum.rules,
            })
            .collect();
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || {
            let outcomes = store.reason_all(&strata).map_err(error)?;
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
        }))
    }

    #[napi(ts_return_type = "Promise<number>")]
    pub fn quad_count(&self) -> Result<AsyncTask<Blocking<u32>>> {
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || {
            store.quad_count().map(count).map_err(error)
        }))
    }

    #[napi(ts_return_type = "Promise<number>")]
    pub fn graph_length(&self, graph: String) -> Result<AsyncTask<Blocking<u32>>> {
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || {
            store.graph_len(&graph).map(count).map_err(error)
        }))
    }

    /// A counter read, so it stays synchronous.
    #[napi]
    pub fn journal_length(&self) -> Result<u32> {
        Ok(count(self.inner()?.journal_len()))
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn invalidate(&self) -> Result<AsyncTask<Blocking<()>>> {
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || store.invalidate().map_err(error)))
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn clear(&self) -> Result<AsyncTask<Blocking<()>>> {
        let store = Arc::clone(self.inner()?);
        Ok(blocking(move || store.clear().map_err(error)))
    }
}

/// Strings per quad in `match`'s result.
const QUAD_ROW: usize = 6;

/// Quads as plain strings — subject, predicate, object kind (`I`, `B` or `L`), object value, the
/// literal's `@language` or datatype, graph — which JS turns into terms several times faster than
/// it parses the same quads as N-Quads. A blank node is `_:id`, the default graph `""`.
fn rows(quads: &[Quad]) -> Vec<String> {
    let mut rows = Vec::with_capacity(quads.len() * QUAD_ROW);
    for quad in quads {
        rows.push(match &quad.subject {
            NamedOrBlankNode::NamedNode(node) => node.as_str().to_owned(),
            NamedOrBlankNode::BlankNode(node) => format!("_:{}", node.as_str()),
        });
        rows.push(quad.predicate.as_str().to_owned());
        match &quad.object {
            Term::NamedNode(node) => {
                rows.extend(["I".to_owned(), node.as_str().to_owned(), String::new()]);
            }
            Term::BlankNode(node) => {
                rows.extend(["B".to_owned(), node.as_str().to_owned(), String::new()]);
            }
            Term::Literal(literal) => {
                rows.push("L".to_owned());
                rows.push(literal.value().to_owned());
                rows.push(match literal.language() {
                    Some(language) => format!("@{language}"),
                    None => literal.datatype().as_str().to_owned(),
                });
            }
        }
        rows.push(match &quad.graph_name {
            GraphName::NamedNode(node) => node.as_str().to_owned(),
            GraphName::BlankNode(node) => format!("_:{}", node.as_str()),
            GraphName::DefaultGraph => String::new(),
        });
    }
    rows
}
