# @ruvector/flow Initialization Validation Checks

Comprehensive validation system that ensures all 350+ features are properly configured before the package can be used.

## Overview

This validation system performs 6 comprehensive checks:

1. **Native Bindings Check** (`native-check.ts`) - Verifies NAPI-RS .node file exists and basic operations work
2. **WASM Fallback Check** (`wasm-check.ts`) - Verifies .wasm file exists, tests SIMD support, and validates operations
3. **Skills Validation** (`skills-check.ts`) - Verifies all 14 skill files exist and validates YAML frontmatter
4. **Agents Validation** (`agents-check.ts`) - Verifies all 10 agent files exist and validates configurations
5. **Commands Validation** (`commands-check.ts`) - Verifies all 13 command files exist and validates syntax
6. **MCP Server Check** (`mcp-check.ts`) - Tests STDIO/SSE transport and verifies all 111+ tools are registered

## Usage

### From Code

```typescript
import { runAllChecks } from '@ruvector/flow/init/checks';

const report = await runAllChecks();
console.log(report.summary);

if (report.failed > 0) {
  console.error('Validation failed!');
  process.exit(1);
}
```

### From CLI

```bash
# Run all checks
node packages/ruvector-flow/init/checks/index.ts

# Or with npm script
npm run validate
```

## Output Format

```
🔍 Running @ruvector/flow initialization checks...

1/6 Checking native bindings...
  ✓ Native Bindings (NAPI-RS)
    Found: packages/ruvector-flow/native/ruvector.node
    ✓ createCollection() available
    ✓ insert() available
    ✓ search() available
    ✓ SIMD support: true

2/6 Checking WASM fallback...
  ✓ WASM Fallback
    Found: packages/ruvector-flow/wasm/ruvector.wasm
    Size: 2.34 MB
    ✓ SIMD support detected (better performance)
    ✓ 45 exports found
    ✓ 5/5 vector operations available

3/6 Validating skills...
  ✓ Skills (14 files)
    Found 14 skill file(s)
    Valid: 14/14
    ✓ All skills valid

4/6 Validating agents...
  ✓ Agents (10 files)
    Found 10 agent file(s)
    Valid: 10/10
    ✓ All agents valid

5/6 Validating commands...
  ✓ Commands (13 files)
    Found 13 command file(s)
    Valid: 13/13
    ✓ All commands valid

6/6 Checking MCP server...
  ✓ MCP Server (111+ tools)
    STDIO Transport: ✓
    Found 115 tools
    SSE Transport: ✓
    Registered Tools: 115/111
    coordination: 4/4 tools
    monitoring: 5/5 tools
    memory: 4/4 tools
    neural: 4/4 tools
    github: 5/5 tools
    system: 4/4 tools
    Tool Execution: ✓
    ✓ MCP server fully operational

============================================================
✓ All checks passed!
============================================================
Validation completed in 1234ms
6/6 checks passed (100%)
============================================================
```

## Check Details

### 1. Native Bindings Check

Validates that NAPI-RS native bindings are available and functional:

- ✓ Checks native directory exists
- ✓ Finds .node file (platform-specific)
- ✓ Loads native module
- ✓ Tests basic operations (createCollection, insert, search)
- ✓ Detects SIMD support
- ⚠ Falls back to WASM if unavailable

### 2. WASM Fallback Check

Ensures WASM fallback is available when native bindings fail:

- ✓ Checks wasm directory exists
- ✓ Finds .wasm file
- ✓ Validates file size
- ✓ Tests WASM loading
- ✓ Tests SIMD support
- ✓ Validates vector operations
- ✓ Checks memory exports

### 3. Skills Validation

Verifies all 14 skill files are properly configured:

**Expected Skills:**
- agentdb-advanced
- agentdb-learning
- agentdb-memory-patterns
- agentdb-optimization
- agentdb-vector-search
- agentic-jujutsu
- flow-nexus-neural
- flow-nexus-platform
- flow-nexus-swarm
- github-code-review
- github-multi-repo
- github-project-management
- github-release-management
- github-workflow-automation

**Validates:**
- ✓ YAML frontmatter exists
- ✓ Required fields (name, description, category)
- ✓ Description section
- ✓ Usage and Features sections
- ✓ Examples present
- ✓ Minimum content length

### 4. Agents Validation

Verifies all 10 agent files are properly configured:

**Expected Agents:**
- coder
- reviewer
- tester
- planner
- researcher
- architect
- debugger
- optimizer
- security
- devops

**Validates:**
- ✓ Role definition
- ✓ Tools/Capabilities section
- ✓ Instructions/Responsibilities
- ✓ Metadata (name, description)
- ✓ Agent-specific requirements
- ✓ Minimum content length

### 5. Commands Validation

Verifies all 13 command files are properly configured:

**Expected Commands:**
- init
- swarm
- agent
- task
- memory
- neural
- benchmark
- github
- workflow
- validate
- deploy
- monitor
- optimize

**Validates:**
- ✓ Syntax/Usage section
- ✓ Description
- ✓ Examples with proper formatting
- ✓ Options/Parameters section
- ✓ Code blocks with language tags
- ✓ Command-specific context

### 6. MCP Server Check

Tests MCP server functionality and tool registration:

**Tests:**
- ✓ STDIO transport (JSON-RPC over stdin/stdout)
- ✓ SSE transport (Server-Sent Events over HTTP)
- ✓ Tool registration (111+ tools)
- ✓ Tool categories (6 categories)
- ✓ Tool execution

**Tool Categories:**
- Coordination (4 tools)
- Monitoring (5 tools)
- Memory (4 tools)
- Neural (4 tools)
- GitHub (5 tools)
- System (4 tools)

## Exit Codes

- `0` - All checks passed
- `1` - One or more checks failed

## Integration

### Package.json Script

```json
{
  "scripts": {
    "validate": "node init/checks/index.ts",
    "prepublishOnly": "npm run validate && npm run build"
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/validate.yml
name: Validate Package

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run validate
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

npm run validate || {
  echo "Validation failed! Please fix errors before committing."
  exit 1
}
```

## Troubleshooting

### Native Bindings Failed

```
✗ Native Bindings (NAPI-RS)
  Native .node file not found
  • Build native bindings with: npm run build:native
```

**Solution:** Build native bindings or ensure WASM fallback is available.

### WASM Fallback Missing

```
✗ WASM Fallback
  WASM directory not found
  ⚠ No fallback available if native bindings fail
```

**Solution:** Build WASM with `npm run build:wasm`.

### Missing Skills/Agents/Commands

```
✗ Skills (14 files)
  Found 10 skill file(s)
  Valid: 10/14
  ⚠ Missing: agentdb-advanced.md
  ⚠ Missing: flow-nexus-neural.md
```

**Solution:** Create missing files or verify file names match expected patterns.

### MCP Server Issues

```
✗ MCP Server (111+ tools)
  STDIO Transport: ✗
  Failed to load native module
```

**Solution:** Ensure package is built (`npm run build`) and dependencies are installed.

## API Reference

### runAllChecks()

Runs all validation checks and returns a comprehensive report.

```typescript
function runAllChecks(): Promise<ValidationReport>
```

### CheckResult Interface

```typescript
interface CheckResult {
  name: string;
  passed: boolean;
  reason?: string;
  details?: string[];
  warnings?: string[];
}
```

### ValidationReport Interface

```typescript
interface ValidationReport {
  timestamp: Date;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  results: CheckResult[];
  summary: string;
}
```

## Contributing

When adding new features to @ruvector/flow:

1. Add validation checks for new components
2. Update expected counts (skills, agents, commands, tools)
3. Run validation before committing
4. Document validation requirements

## License

MIT
