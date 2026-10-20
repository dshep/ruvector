// The platforms @dshep/ruvector-core is built for, and the engine package each
// one loads. The loader, the assembler and their tests all read this table.
//
// Each key is a platform package's suffix; its value is that package's npm
// os / cpu / libc constraints.
const PLATFORMS = {
  'linux-x64-gnu': { os: ['linux'], cpu: ['x64'], libc: ['glibc'] },
  'linux-arm64-gnu': { os: ['linux'], cpu: ['arm64'], libc: ['glibc'] },
  'darwin-x64': { os: ['darwin'], cpu: ['x64'] },
  'darwin-arm64': { os: ['darwin'], cpu: ['arm64'] },
  'win32-x64-msvc': { os: ['win32'], cpu: ['x64'] },
};

function packageName(key) {
  return `@dshep/ruvector-core-${key}`;
}

function noEngine(host) {
  return new Error(
    `@dshep/ruvector-core has no prebuilt engine for ${host}; built: ${Object.keys(PLATFORMS).join(', ')}.`
  );
}

// The engine package for a host. `glibc` is true only when the host's C
// library is known to be glibc: a Linux host where it is not known is refused,
// never handed a glibc build.
function packageFor({ platform, arch, glibc }) {
  const candidates = Object.entries(PLATFORMS).filter(
    ([, c]) => c.os.includes(platform) && c.cpu.includes(arch)
  );
  if (candidates.length === 0) throw noEngine(`${platform}-${arch}`);
  const match = candidates.find(([, c]) => !c.libc || (glibc === true && c.libc.includes('glibc')));
  if (!match) throw noEngine(`${platform}-${arch}-musl`);
  return packageName(match[0]);
}

module.exports = { PLATFORMS, packageName, packageFor };
