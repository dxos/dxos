//! A thin synchronous layer over a Turso connection: prepared statements cached by their SQL text, and
//! row reads without copying a row into an owned vector first.

use std::collections::HashMap;
use std::num::NonZero;
use std::sync::Arc;

use turso_core::{Connection, Numeric, Statement, StepResult, Value as SqlValue};

use crate::wire::Writer;

pub type SqlResult<T> = Result<T, String>;

/// A bound parameter.
#[derive(Debug, Clone)]
pub enum Param {
    Null,
    Int(i64),
    Float(f64),
    Text(String),
    Blob(Vec<u8>),
}

impl Param {
    fn to_sql(&self) -> SqlResult<SqlValue> {
        Ok(match self {
            Param::Null => SqlValue::Null,
            Param::Int(value) => SqlValue::Numeric(Numeric::Integer(*value)),
            Param::Float(value) => SqlValue::from_f64(*value),
            Param::Text(value) => SqlValue::from_text(value.clone()),
            Param::Blob(value) => SqlValue::from_slice(value).map_err(|err| err.to_string())?,
        })
    }
}

impl From<&str> for Param {
    fn from(value: &str) -> Self {
        Param::Text(value.to_owned())
    }
}

impl From<String> for Param {
    fn from(value: String) -> Self {
        Param::Text(value)
    }
}

impl From<i64> for Param {
    fn from(value: i64) -> Self {
        Param::Int(value)
    }
}

impl From<Option<String>> for Param {
    fn from(value: Option<String>) -> Self {
        value.map(Param::Text).unwrap_or(Param::Null)
    }
}

impl From<Option<i64>> for Param {
    fn from(value: Option<i64>) -> Self {
        value.map(Param::Int).unwrap_or(Param::Null)
    }
}

/// One column value of a row, borrowed from the statement.
pub enum Cell<'a> {
    Null,
    Int(i64),
    Float(f64),
    Text(&'a str),
    Blob(&'a [u8]),
}

impl<'a> Cell<'a> {
    pub fn int(&self) -> Option<i64> {
        match self {
            Cell::Int(value) => Some(*value),
            Cell::Float(value) => Some(*value as i64),
            _ => None,
        }
    }

    pub fn text(&self) -> Option<&'a str> {
        match self {
            Cell::Text(value) => Some(value),
            _ => None,
        }
    }

    pub fn blob(&self) -> Option<&'a [u8]> {
        match self {
            Cell::Blob(value) => Some(value),
            _ => None,
        }
    }
}

fn cell(value: &SqlValue) -> Cell<'_> {
    match value {
        SqlValue::Null => Cell::Null,
        SqlValue::Numeric(Numeric::Integer(value)) => Cell::Int(*value),
        SqlValue::Numeric(Numeric::Float(value)) => Cell::Float(f64::from(*value)),
        SqlValue::Text(text) => Cell::Text(text.as_str()),
        SqlValue::Blob(blob) => Cell::Blob(blob.as_slice()),
    }
}

pub struct Db {
    pub conn: Arc<Connection>,
    cache: HashMap<String, Statement>,
    /// Statements executed since open, for the benchmark report.
    pub statements: u64,
}

impl Db {
    pub fn new(conn: Arc<Connection>) -> Self {
        Db { conn, cache: HashMap::new(), statements: 0 }
    }

    /// Runs statements with no parameters and no rows, such as DDL.
    pub fn exec_batch(&mut self, sql: &str) -> SqlResult<()> {
        self.statements += 1;
        self.conn.execute(sql).map_err(|err| format!("{err}: {sql}"))
    }

    fn prepared(&mut self, sql: &str) -> SqlResult<&mut Statement> {
        if !self.cache.contains_key(sql) {
            let statement = self.conn.prepare(sql).map_err(|err| format!("{err}: {sql}"))?;
            self.cache.insert(sql.to_owned(), statement);
        }
        Ok(self.cache.get_mut(sql).expect("inserted above"))
    }

    /// Runs one statement, calling `row` for each result row with its cells.
    pub fn query(
        &mut self,
        sql: &str,
        params: &[Param],
        mut row: impl FnMut(&[Cell<'_>]) -> SqlResult<()>,
    ) -> SqlResult<()> {
        self.statements += 1;
        let statement = self.prepared(sql)?;
        statement.reset().map_err(|err| err.to_string())?;
        statement.clear_bindings();
        for (index, param) in params.iter().enumerate() {
            let position = NonZero::new(index + 1).expect("index + 1 is never zero");
            statement.bind_at(position, param.to_sql()?).map_err(|err| err.to_string())?;
        }
        let result = loop {
            match statement.step() {
                Ok(StepResult::Row) => {
                    let current = statement.row().expect("a row after StepResult::Row");
                    // Cells borrow the row; they are rebuilt for each row, so the lifetimes stay local.
                    let values: Vec<&SqlValue> = current.get_values().collect();
                    let row_cells: Vec<Cell<'_>> = values.iter().map(|value| cell(value)).collect();
                    if let Err(err) = row(&row_cells) {
                        break Err(err);
                    }
                }
                Ok(StepResult::Done) => break Ok(()),
                Ok(StepResult::IO) | Ok(StepResult::Yield) | Ok(StepResult::Sleep { .. }) => {
                    if let Err(err) = statement._io().step() {
                        break Err(format!("{err}: {sql}"));
                    }
                }
                Ok(StepResult::Busy) => break Err(format!("database busy: {sql}")),
                Ok(StepResult::Interrupt) => break Err(format!("interrupted: {sql}")),
                Err(err) => break Err(format!("{err}: {sql}")),
            }
        };
        // A statement left mid-iteration would hold its read transaction open.
        let _ = statement.reset();
        result
    }

    pub fn execute(&mut self, sql: &str, params: &[Param]) -> SqlResult<()> {
        self.query(sql, params, |_| Ok(()))
    }

    /// Writes a statement's result as a row table (see `src/rows.ts`): column names, then one
    /// fixed-size cell per column per row, with text and blob payloads after the cells.
    pub fn query_table(&mut self, sql: &str, params: &[Param], out: &mut Writer) -> SqlResult<()> {
        // Payloads are gathered apart from the fixed cells so the cells stay at computable offsets.
        let mut heap: Vec<u8> = Vec::new();
        let mut cells: Vec<u8> = Vec::new();
        let mut rows: u32 = 0;
        let mut columns: u32 = 0;
        self.query(sql, params, |row| {
            columns = row.len() as u32;
            rows += 1;
            for value in row {
                let (tag, len, payload): (u32, u32, u64) = match value {
                    Cell::Null => (0, 0, 0),
                    Cell::Int(value) => (1, 0, *value as u64),
                    Cell::Float(value) => (2, 0, value.to_bits()),
                    Cell::Text(text) => {
                        let offset = heap.len() as u64;
                        heap.extend_from_slice(text.as_bytes());
                        (3, text.len() as u32, offset)
                    }
                    Cell::Blob(blob) => {
                        let offset = heap.len() as u64;
                        heap.extend_from_slice(blob);
                        (4, blob.len() as u32, offset)
                    }
                };
                cells.extend_from_slice(&tag.to_le_bytes());
                cells.extend_from_slice(&len.to_le_bytes());
                cells.extend_from_slice(&payload.to_le_bytes());
            }
            Ok(())
        })?;
        let statement = self.prepared(sql)?;
        let count = statement.num_columns();
        let names: Vec<String> = (0..count).map(|index| statement.get_column_name(index).into_owned()).collect();
        // Header: column count, row count, heap offset; then names; then cells; then the heap.
        let start = out.len();
        out.u32(names.len() as u32);
        out.u32(rows);
        let heap_at = out.len();
        out.u32(0);
        for name in &names {
            out.str(name);
        }
        debug_assert!(rows == 0 || columns as usize == names.len());
        out.buf.extend_from_slice(&cells);
        let heap_offset = (out.len() - start) as u32;
        out.patch_u32(heap_at, heap_offset);
        out.buf.extend_from_slice(&heap);
        Ok(())
    }
}
