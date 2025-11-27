/**
 * Agents Validation Check
 * Verifies all 10 agent files exist and validates configurations
 */

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Expected agent configurations
 */
const EXPECTED_AGENTS = [
  'coder',
  'reviewer',
  'tester',
  'planner',
  'researcher',
  'architect',
  'debugger',
  'optimizer',
  'security',
  'devops',
];

interface AgentValidation {
  name: string;
  exists: boolean;
  hasRole: boolean;
  hasTools: boolean;
  hasInstructions: boolean;
  errors: string[];
}

/**
 * Check agents validation
 */
export async function checkAgents(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'Agents (10 files)',
    passed: false,
    details: [],
    warnings: [],
  };

  try {
    const agentsDir = join(__dirname, '../agents');

    // 1. Check if agents directory exists
    if (!existsSync(agentsDir)) {
      result.reason = 'Agents directory not found';
      result.details!.push('Expected: packages/ruvector-flow/init/agents/');
      return result;
    }

    // 2. Get all agent files
    const files = await readdir(agentsDir);
    const agentFiles = files.filter(f => extname(f) === '.md');

    result.details!.push(`Found ${agentFiles.length} agent file(s)`);

    // 3. Validate each expected agent
    const validations: AgentValidation[] = [];

    for (const agentName of EXPECTED_AGENTS) {
      const validation = await validateAgent(agentsDir, agentName);
      validations.push(validation);

      if (!validation.exists) {
        result.warnings!.push(`Missing: ${agentName}.md`);
      } else if (validation.errors.length > 0) {
        result.warnings!.push(`${agentName}: ${validation.errors.join(', ')}`);
      }
    }

    // 4. Check for extra files
    const expectedFiles = new Set(EXPECTED_AGENTS.map(a => `${a}.md`));
    const extraFiles = agentFiles.filter(f => !expectedFiles.has(f));

    if (extraFiles.length > 0) {
      result.details!.push(`Extra files: ${extraFiles.join(', ')}`);
    }

    // 5. Calculate pass/fail
    const existingAgents = validations.filter(v => v.exists);
    const validAgents = validations.filter(v => v.exists && v.errors.length === 0);

    result.details!.push(`Valid: ${validAgents.length}/${EXPECTED_AGENTS.length}`);

    if (existingAgents.length < EXPECTED_AGENTS.length) {
      result.reason = `Missing ${EXPECTED_AGENTS.length - existingAgents.length} agent file(s)`;
    } else if (validAgents.length < existingAgents.length) {
      result.reason = `${existingAgents.length - validAgents.length} agent(s) have validation errors`;
    } else {
      result.passed = true;
      result.details!.push('✓ All agents valid');
    }

    // 6. Add validation details
    const invalidAgents = validations.filter(v => v.exists && v.errors.length > 0);
    if (invalidAgents.length > 0) {
      result.details!.push('\nValidation errors:');
      invalidAgents.forEach(agent => {
        result.details!.push(`  ${agent.name}: ${agent.errors.join(', ')}`);
      });
    }
  } catch (error) {
    result.reason = `Agents check error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

/**
 * Validate individual agent file
 */
async function validateAgent(agentsDir: string, agentName: string): Promise<AgentValidation> {
  const validation: AgentValidation = {
    name: agentName,
    exists: false,
    hasRole: false,
    hasTools: false,
    hasInstructions: false,
    errors: [],
  };

  const agentPath = join(agentsDir, `${agentName}.md`);

  if (!existsSync(agentPath)) {
    return validation;
  }

  validation.exists = true;

  try {
    const content = await readFile(agentPath, 'utf-8');

    // Check for role definition
    if (content.includes('## Role') || content.includes('# Role') || content.includes('role:')) {
      validation.hasRole = true;
    } else {
      validation.errors.push('Missing Role definition');
    }

    // Check for tools/capabilities
    if (
      content.includes('## Tools') ||
      content.includes('## Capabilities') ||
      content.includes('tools:')
    ) {
      validation.hasTools = true;
    } else {
      validation.errors.push('Missing Tools/Capabilities section');
    }

    // Check for instructions
    if (
      content.includes('## Instructions') ||
      content.includes('## Responsibilities') ||
      content.includes('## Tasks')
    ) {
      validation.hasInstructions = true;
    } else {
      validation.errors.push('Missing Instructions section');
    }

    // Check minimum content length
    if (content.length < 300) {
      validation.errors.push('Content too short (< 300 chars)');
    }

    // Check for agent metadata
    const requiredMetadata = ['name', 'description'];
    for (const meta of requiredMetadata) {
      if (!content.toLowerCase().includes(meta)) {
        validation.errors.push(`Missing ${meta} metadata`);
      }
    }

    // Validate agent-specific requirements
    switch (agentName) {
      case 'coder':
        if (!content.includes('code') && !content.includes('implementation')) {
          validation.errors.push('Missing code/implementation focus');
        }
        break;
      case 'tester':
        if (!content.includes('test') && !content.includes('quality')) {
          validation.errors.push('Missing test/quality focus');
        }
        break;
      case 'reviewer':
        if (!content.includes('review') && !content.includes('quality')) {
          validation.errors.push('Missing review/quality focus');
        }
        break;
      case 'security':
        if (!content.includes('security') && !content.includes('vulnerability')) {
          validation.errors.push('Missing security focus');
        }
        break;
    }
  } catch (error) {
    validation.errors.push(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
  }

  return validation;
}

/**
 * Get agents info
 */
export async function getAgentsInfo(): Promise<{
  total: number;
  valid: number;
  roles: string[];
}> {
  const agentsDir = join(__dirname, '../agents');

  if (!existsSync(agentsDir)) {
    return { total: 0, valid: 0, roles: [] };
  }

  const files = await readdir(agentsDir);
  const agentFiles = files.filter(f => extname(f) === '.md');

  return {
    total: agentFiles.length,
    valid: 0, // Would need full validation
    roles: ['Development', 'Quality', 'Security', 'Operations'],
  };
}

/**
 * Validate agent tool definitions
 */
export function validateAgentTools(tools: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(tools)) {
    errors.push('Tools must be an array');
    return { valid: false, errors };
  }

  if (tools.length === 0) {
    errors.push('Agent must have at least one tool');
  }

  const validTools = new Set([
    'file-read',
    'file-write',
    'file-edit',
    'bash',
    'search',
    'memory',
    'mcp',
  ]);

  for (const tool of tools) {
    if (!validTools.has(tool)) {
      errors.push(`Unknown tool: ${tool}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
