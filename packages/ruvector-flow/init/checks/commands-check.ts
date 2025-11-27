/**
 * Commands Validation Check
 * Verifies all 13 command files exist and validates syntax
 */

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Expected command configurations
 */
const EXPECTED_COMMANDS = [
  'init',
  'swarm',
  'agent',
  'task',
  'memory',
  'neural',
  'benchmark',
  'github',
  'workflow',
  'validate',
  'deploy',
  'monitor',
  'optimize',
];

interface CommandValidation {
  name: string;
  exists: boolean;
  hasSyntax: boolean;
  hasDescription: boolean;
  hasExamples: boolean;
  errors: string[];
}

/**
 * Check commands validation
 */
export async function checkCommands(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'Commands (13 files)',
    passed: false,
    details: [],
    warnings: [],
  };

  try {
    const commandsDir = join(__dirname, '../commands');

    // 1. Check if commands directory exists
    if (!existsSync(commandsDir)) {
      result.reason = 'Commands directory not found';
      result.details!.push('Expected: packages/ruvector-flow/init/commands/');
      return result;
    }

    // 2. Get all command files
    const files = await readdir(commandsDir);
    const commandFiles = files.filter(f => extname(f) === '.md');

    result.details!.push(`Found ${commandFiles.length} command file(s)`);

    // 3. Validate each expected command
    const validations: CommandValidation[] = [];

    for (const commandName of EXPECTED_COMMANDS) {
      const validation = await validateCommand(commandsDir, commandName);
      validations.push(validation);

      if (!validation.exists) {
        result.warnings!.push(`Missing: ${commandName}.md`);
      } else if (validation.errors.length > 0) {
        result.warnings!.push(`${commandName}: ${validation.errors.join(', ')}`);
      }
    }

    // 4. Check for extra files
    const expectedFiles = new Set(EXPECTED_COMMANDS.map(c => `${c}.md`));
    const extraFiles = commandFiles.filter(f => !expectedFiles.has(f));

    if (extraFiles.length > 0) {
      result.details!.push(`Extra files: ${extraFiles.join(', ')}`);
    }

    // 5. Calculate pass/fail
    const existingCommands = validations.filter(v => v.exists);
    const validCommands = validations.filter(v => v.exists && v.errors.length === 0);

    result.details!.push(`Valid: ${validCommands.length}/${EXPECTED_COMMANDS.length}`);

    if (existingCommands.length < EXPECTED_COMMANDS.length) {
      result.reason = `Missing ${EXPECTED_COMMANDS.length - existingCommands.length} command file(s)`;
    } else if (validCommands.length < existingCommands.length) {
      result.reason = `${existingCommands.length - validCommands.length} command(s) have validation errors`;
    } else {
      result.passed = true;
      result.details!.push('✓ All commands valid');
    }

    // 6. Add validation details
    const invalidCommands = validations.filter(v => v.exists && v.errors.length > 0);
    if (invalidCommands.length > 0) {
      result.details!.push('\nValidation errors:');
      invalidCommands.forEach(cmd => {
        result.details!.push(`  ${cmd.name}: ${cmd.errors.join(', ')}`);
      });
    }
  } catch (error) {
    result.reason = `Commands check error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

/**
 * Validate individual command file
 */
async function validateCommand(commandsDir: string, commandName: string): Promise<CommandValidation> {
  const validation: CommandValidation = {
    name: commandName,
    exists: false,
    hasSyntax: false,
    hasDescription: false,
    hasExamples: false,
    errors: [],
  };

  const commandPath = join(commandsDir, `${commandName}.md`);

  if (!existsSync(commandPath)) {
    return validation;
  }

  validation.exists = true;

  try {
    const content = await readFile(commandPath, 'utf-8');

    // Check for syntax section
    if (
      content.includes('## Syntax') ||
      content.includes('## Usage') ||
      content.includes('```bash')
    ) {
      validation.hasSyntax = true;
    } else {
      validation.errors.push('Missing Syntax/Usage section');
    }

    // Check for description
    if (
      content.includes('## Description') ||
      content.includes('# Description') ||
      content.split('\n')[0].trim().startsWith('#')
    ) {
      validation.hasDescription = true;
    } else {
      validation.errors.push('Missing Description');
    }

    // Check for examples
    if (content.includes('## Example') || content.match(/```[\s\S]*?```/g)) {
      validation.hasExamples = true;
    } else {
      validation.errors.push('Missing Examples');
    }

    // Check minimum content length
    if (content.length < 200) {
      validation.errors.push('Content too short (< 200 chars)');
    }

    // Validate command structure
    const requiredSections = ['Options', 'Parameters'];
    let hasOptions = false;

    for (const section of requiredSections) {
      if (content.includes(`## ${section}`) || content.includes(`# ${section}`)) {
        hasOptions = true;
        break;
      }
    }

    if (!hasOptions) {
      validation.errors.push('Missing Options/Parameters section');
    }

    // Validate command-specific requirements
    switch (commandName) {
      case 'init':
        if (!content.includes('initialize') && !content.includes('setup')) {
          validation.errors.push('Missing initialization context');
        }
        break;
      case 'swarm':
        if (!content.includes('swarm') && !content.includes('agent')) {
          validation.errors.push('Missing swarm/agent context');
        }
        break;
      case 'github':
        if (!content.includes('github') && !content.includes('repository')) {
          validation.errors.push('Missing GitHub context');
        }
        break;
    }

    // Check for proper code block formatting
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      for (const block of codeBlocks) {
        if (!block.match(/```[a-z]+\n/)) {
          validation.errors.push('Code blocks should specify language');
          break;
        }
      }
    }
  } catch (error) {
    validation.errors.push(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
  }

  return validation;
}

/**
 * Get commands info
 */
export async function getCommandsInfo(): Promise<{
  total: number;
  valid: number;
  categories: string[];
}> {
  const commandsDir = join(__dirname, '../commands');

  if (!existsSync(commandsDir)) {
    return { total: 0, valid: 0, categories: [] };
  }

  const files = await readdir(commandsDir);
  const commandFiles = files.filter(f => extname(f) === '.md');

  return {
    total: commandFiles.length,
    valid: 0, // Would need full validation
    categories: ['Setup', 'Orchestration', 'Integration', 'Monitoring'],
  };
}

/**
 * Parse command syntax
 */
export function parseCommandSyntax(syntax: string): {
  command: string;
  options: string[];
  arguments: string[];
} {
  const parts = syntax.trim().split(/\s+/);
  const command = parts[0] || '';
  const options: string[] = [];
  const args: string[] = [];

  for (let i = 1; i < parts.length; i++) {
    if (parts[i]?.startsWith('-')) {
      options.push(parts[i]);
    } else if (parts[i]) {
      args.push(parts[i]);
    }
  }

  return { command, options, arguments: args };
}
