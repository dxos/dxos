// Hack so we can have the actual executor in ESM.
module.exports = async (...args) => {
  const impl = await import('./dist/src/executor.js');
  return impl.default(...args);
}