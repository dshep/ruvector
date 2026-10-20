// Loads the prebuilt engine for this platform. Each platform's binary is its
// own package, listed as an optional dependency, so npm installs only the one
// this machine needs.
const { packageFor } = require('./platforms.cjs');

// Node reports a glibc version only when the process runs on glibc.
function runsOnGlibc() {
  if (process.platform !== 'linux') return false;
  return Boolean(process.report.getReport().header.glibcVersionRuntime);
}

function loadNativeModule() {
  const packageName = packageFor({ platform: process.platform, arch: process.arch, glibc: runsOnGlibc() });
  try {
    return require(packageName);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `The engine package ${packageName} is not installed. ` +
          'Reinstall @dshep/ruvector-core with optional dependencies enabled.'
      );
    }
    throw error;
  }
}

module.exports = loadNativeModule();
