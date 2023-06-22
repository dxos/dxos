
// Empty module to stub stripped packages.
module.exports = new Proxy({}, {
  get: (target, prop) => {
    throw new Error(`Package has been stripped`);
  }
});