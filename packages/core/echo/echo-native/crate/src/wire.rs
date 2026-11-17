//! Binary encodings shared with `src/wire.ts`: a sequential reader/writer for call arguments, and the
//! tagged value tree JS uses to hand an object's structure to Rust.

/// Tags of an encoded value; `src/wire.ts` writes the same ones.
pub const TAG_NULL: u8 = 0;
pub const TAG_FALSE: u8 = 1;
pub const TAG_TRUE: u8 = 2;
pub const TAG_INT: u8 = 3;
pub const TAG_FLOAT: u8 = 4;
pub const TAG_STRING: u8 = 5;
pub const TAG_BYTES: u8 = 6;
pub const TAG_ARRAY: u8 = 7;
pub const TAG_MAP: u8 = 8;

/// A JS value as JS encoded it; map entries keep their insertion order.
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    Bytes(Vec<u8>),
    Array(Vec<Value>),
    Map(Vec<(String, Value)>),
}

impl Value {
    pub fn get(&self, key: &str) -> Option<&Value> {
        match self {
            Value::Map(entries) => entries.iter().find(|(name, _)| name == key).map(|(_, value)| value),
            _ => None,
        }
    }
}

pub struct Reader<'a> {
    bytes: &'a [u8],
    pos: usize,
}

pub type WireResult<T> = Result<T, String>;

impl<'a> Reader<'a> {
    pub fn new(bytes: &'a [u8]) -> Self {
        Reader { bytes, pos: 0 }
    }

    fn take(&mut self, len: usize) -> WireResult<&'a [u8]> {
        let end = self.pos.checked_add(len).ok_or("overflow")?;
        if end > self.bytes.len() {
            return Err(format!("input truncated at {} (+{})", self.pos, len));
        }
        let slice = &self.bytes[self.pos..end];
        self.pos = end;
        Ok(slice)
    }

    pub fn u8(&mut self) -> WireResult<u8> {
        Ok(self.take(1)?[0])
    }

    pub fn u32(&mut self) -> WireResult<u32> {
        let bytes = self.take(4)?;
        Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    pub fn f64(&mut self) -> WireResult<f64> {
        let bytes = self.take(8)?;
        let mut array = [0u8; 8];
        array.copy_from_slice(bytes);
        Ok(f64::from_le_bytes(array))
    }

    pub fn bytes(&mut self) -> WireResult<&'a [u8]> {
        let len = self.u32()? as usize;
        self.take(len)
    }

    pub fn str(&mut self) -> WireResult<&'a str> {
        let bytes = self.bytes()?;
        std::str::from_utf8(bytes).map_err(|err| err.to_string())
    }

    /// A string, or `None` when JS wrote the absent marker (length `u32::MAX`).
    pub fn opt_str(&mut self) -> WireResult<Option<&'a str>> {
        let len = self.u32()?;
        if len == u32::MAX {
            return Ok(None);
        }
        let bytes = self.take(len as usize)?;
        std::str::from_utf8(bytes).map(Some).map_err(|err| err.to_string())
    }

    pub fn value(&mut self) -> WireResult<Value> {
        Ok(match self.u8()? {
            TAG_NULL => Value::Null,
            TAG_FALSE => Value::Bool(false),
            TAG_TRUE => Value::Bool(true),
            TAG_INT => Value::Int(self.f64()? as i64),
            TAG_FLOAT => Value::Float(self.f64()?),
            TAG_STRING => Value::Str(self.str()?.to_owned()),
            TAG_BYTES => Value::Bytes(self.bytes()?.to_vec()),
            TAG_ARRAY => {
                let count = self.u32()? as usize;
                let mut items = Vec::with_capacity(count);
                for _ in 0..count {
                    items.push(self.value()?);
                }
                Value::Array(items)
            }
            TAG_MAP => {
                let count = self.u32()? as usize;
                let mut entries = Vec::with_capacity(count);
                for _ in 0..count {
                    let key = self.str()?.to_owned();
                    entries.push((key, self.value()?));
                }
                Value::Map(entries)
            }
            tag => return Err(format!("unknown value tag {tag}")),
        })
    }
}

/// The output region JS reads after a call; reused across calls so its capacity amortizes.
#[derive(Default)]
pub struct Writer {
    pub buf: Vec<u8>,
}

impl Writer {
    pub fn clear(&mut self) {
        self.buf.clear();
    }

    pub fn len(&self) -> usize {
        self.buf.len()
    }

    pub fn u8(&mut self, value: u8) {
        self.buf.push(value);
    }

    pub fn u32(&mut self, value: u32) {
        self.buf.extend_from_slice(&value.to_le_bytes());
    }

    pub fn f64(&mut self, value: f64) {
        self.buf.extend_from_slice(&value.to_le_bytes());
    }

    pub fn bytes(&mut self, value: &[u8]) {
        self.u32(value.len() as u32);
        self.buf.extend_from_slice(value);
    }

    pub fn str(&mut self, value: &str) {
        self.bytes(value.as_bytes());
    }

    pub fn opt_str(&mut self, value: Option<&str>) {
        match value {
            Some(text) => self.str(text),
            None => self.u32(u32::MAX),
        }
    }

    pub fn patch_u32(&mut self, at: usize, value: u32) {
        self.buf[at..at + 4].copy_from_slice(&value.to_le_bytes());
    }
}
