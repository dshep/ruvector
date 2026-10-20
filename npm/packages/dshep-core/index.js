// Loads the prebuilt engine for this platform. Each platform's binary is its
// own package, listed as an optional dependency, so npm installs only the one
// this machine needs.
const { platform, arch } = process;

const platformPackages = {
  linux: { x64: '@dshep/ruvector-core-linux-x64-gnu', arm64: '@dshep/ruvector-core-linux-arm64-gnu' },
  darwin: { x64: '@dshep/ruvector-core-darwin-x64', arm64: '@dshep/ruvector-core-darwin-arm64' },
  win32: { x64: '@dshep/ruvector-core-win32-x64-msvc' },
};

function loadNativeModule() {
  const packageName = platformPackages[platform] && platformPackages[platform][arch];
  if (!packageName) {
    throw new Error(
      `@dshep/ruvector-core has no prebuilt engine for ${platform}-${arch}. ` +
        'Built platforms: Linux x64 and arm64 (glibc), macOS x64 and arm64, Windows x64.'
    );
  }
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
