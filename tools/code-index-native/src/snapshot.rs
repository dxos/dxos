//
// Copyright 2026 DXOS.org
//

//! The premises of the last reasoning run, kept on disk so the next run starts from them plus the
//! journal instead of decoding every premise out of RocksDB again — a RocksDB read per non-inline
//! term, which cost more than all the rules together on a warm pass.
//!
//! The file is only ever trusted through a token the engine state records once the run commits
//! (`store::reason_all`); every reset of that state forgets the token, and with it the file.

use std::fs::File;
use std::io::{self, BufReader, BufWriter, Read, Write};
use std::path::Path;

use oxigraph::model::{BlankNode, Literal, NamedNode, Term};
use rustc_hash::FxHashMap;

use crate::facts::{Dict, Id, TripleSet};

const MAGIC: &[u8; 8] = b"CIXSNAP1";

const NAMED: u8 = 0;
const BLANK: u8 = 1;
const TYPED: u8 = 2;
const TAGGED: u8 = 3;

/// Writes `set` under `token`, through a temporary file so a reader never sees half of one.
pub fn write(path: &Path, token: &str, set: &TripleSet, dict: &Dict) -> io::Result<()> {
    let temporary = path.with_extension("tmp");
    let mut out = BufWriter::new(File::create(&temporary)?);
    out.write_all(MAGIC)?;
    write_str(&mut out, token)?;

    let mut local: FxHashMap<Id, u32> = FxHashMap::default();
    let mut terms: Vec<Id> = Vec::new();
    let mut triples: Vec<[u32; 3]> = Vec::with_capacity(set.len());
    for triple in set.iter() {
        triples.push(triple.map(|id| {
            *local.entry(id).or_insert_with(|| {
                terms.push(id);
                u32::try_from(terms.len() - 1).expect("snapshot dictionary overflow")
            })
        }));
    }

    write_len(&mut out, terms.len())?;
    for id in terms {
        match dict.term(id) {
            Term::NamedNode(node) => {
                out.write_all(&[NAMED])?;
                write_str(&mut out, node.as_str())?;
            }
            Term::BlankNode(node) => {
                out.write_all(&[BLANK])?;
                write_str(&mut out, node.as_str())?;
            }
            Term::Literal(literal) => match literal.language() {
                Some(language) => {
                    out.write_all(&[TAGGED])?;
                    write_str(&mut out, literal.value())?;
                    write_str(&mut out, language)?;
                }
                None => {
                    out.write_all(&[TYPED])?;
                    write_str(&mut out, literal.value())?;
                    write_str(&mut out, literal.datatype().as_str())?;
                }
            },
        }
    }
    write_len(&mut out, triples.len())?;
    for triple in triples {
        for id in triple {
            out.write_all(&id.to_le_bytes())?;
        }
    }
    out.into_inner()
        .map_err(io::IntoInnerError::into_error)?
        .sync_all()?;
    std::fs::rename(temporary, path)
}

/// The set written under `token`, its terms interned into `dict`; `None` when the file is absent or
/// was written under another token.
pub fn read(path: &Path, token: &str, dict: &Dict) -> io::Result<Option<TripleSet>> {
    let file = match File::open(path) {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    let mut input = BufReader::new(file);
    let mut magic = [0; 8];
    input.read_exact(&mut magic)?;
    if &magic != MAGIC || read_str(&mut input)? != token {
        return Ok(None);
    }

    let count = read_len(&mut input)?;
    let mut ids: Vec<Id> = Vec::with_capacity(count);
    for _ in 0..count {
        let mut tag = [0; 1];
        input.read_exact(&mut tag)?;
        let term: Term = match tag[0] {
            NAMED => NamedNode::new_unchecked(read_str(&mut input)?).into(),
            BLANK => BlankNode::new_unchecked(read_str(&mut input)?).into(),
            TYPED => {
                let value = read_str(&mut input)?;
                let datatype = NamedNode::new_unchecked(read_str(&mut input)?);
                Literal::new_typed_literal(value, datatype).into()
            }
            TAGGED => {
                let value = read_str(&mut input)?;
                let language = read_str(&mut input)?;
                Literal::new_language_tagged_literal_unchecked(value, language).into()
            }
            other => return Err(invalid(format!("unknown term tag {other}"))),
        };
        ids.push(dict.intern(&term));
    }

    let count = read_len(&mut input)?;
    let mut set = TripleSet::default();
    let mut buffer = [0; 12];
    for _ in 0..count {
        input.read_exact(&mut buffer)?;
        let mut triple = [0; 3];
        for (position, chunk) in buffer.chunks_exact(4).enumerate() {
            let local = u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
            triple[position] = *ids
                .get(local as usize)
                .ok_or_else(|| invalid(format!("term {local} out of range")))?;
        }
        set.insert(triple);
    }
    Ok(Some(set))
}

fn invalid(message: String) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message)
}

fn write_len(out: &mut impl Write, len: usize) -> io::Result<()> {
    out.write_all(
        &u64::try_from(len)
            .map_err(|error| invalid(error.to_string()))?
            .to_le_bytes(),
    )
}

fn read_len(input: &mut impl Read) -> io::Result<usize> {
    let mut bytes = [0; 8];
    input.read_exact(&mut bytes)?;
    usize::try_from(u64::from_le_bytes(bytes)).map_err(|error| invalid(error.to_string()))
}

fn write_str(out: &mut impl Write, value: &str) -> io::Result<()> {
    write_len(out, value.len())?;
    out.write_all(value.as_bytes())
}

/// No term the indexer writes comes near this; a longer length means the file is damaged.
const MAX_STR: usize = 1 << 28;

fn read_str(input: &mut impl Read) -> io::Result<String> {
    let len = read_len(input)?;
    if len > MAX_STR {
        return Err(invalid(format!("string of {len} bytes")));
    }
    let mut bytes = vec![0; len];
    input.read_exact(&mut bytes)?;
    String::from_utf8(bytes).map_err(|error| invalid(error.to_string()))
}
