# @dshep/ruvector-core

RuVector's vector engine for Node, built from [dshep/ruvector](https://github.com/dshep/ruvector)
for [LedgerDB](https://github.com/dshep/ledgerdb). It is the upstream engine plus a
`VectorDb.close()` whose promise resolves once the database and its file lock are
released, so a closed store can be opened again by this process or another one.

Versions are the upstream `@ruvector/core` version plus a counter, for example
`0.1.30-ledgerdb.1`. Each platform's binary is its own package,
`@dshep/ruvector-core-<platform>`, installed as an optional dependency.

The packages are published to GitHub Packages, so installing them needs a token
with `read:packages` and this line in `.npmrc`:

```
@dshep:registry=https://npm.pkg.github.com
```

They are published by the `Publish @dshep/ruvector-core` workflow when the tag `dshep-core-v<version>` is pushed.
