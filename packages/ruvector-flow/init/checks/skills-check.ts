/**
 * Skills Validation Check
 * Verifies all 14 skill files exist and validates YAML frontmatter
 */

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Expected skills configuration
 */
const EXPECTED_SKILLS = [
  'agentdb-advanced',
  'agentdb-learning',
  'agentdb-memory-patterns',
  'agentdb-optimization',
  'agentdb-vector-search',
  'agentic-jujutsu',
  'flow-nexus-neural',
  'flow-nexus-platform',
  'flow-nexus-swarm',
  'github-code-review',
  'github-multi-repo',
  'github-project-management',
  'github-release-management',
  'github-workflow-automation',
];

interface SkillValidation {
  name: string;
  exists: boolean;
  hasYaml: boolean;
  hasDescription: boolean;
  hasExamples: boolean;
  errors: string[];
}

/**
 * Check skills validation
 */
export async function checkSkills(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'Skills (14 files)',
    passed: false,
    details: [],
    warnings: [],
  };

  try {
    const skillsDir = join(__dirname, '../skills');

    // 1. Check if skills directory exists
    if (!existsSync(skillsDir)) {
      result.reason = 'Skills directory not found';
      result.details!.push('Expected: packages/ruvector-flow/init/skills/');
      return result;
    }

    // 2. Get all skill files
    const files = await readdir(skillsDir);
    const skillFiles = files.filter(f => extname(f) === '.md');

    result.details!.push(`Found ${skillFiles.length} skill file(s)`);

    // 3. Validate each expected skill
    const validations: SkillValidation[] = [];

    for (const skillName of EXPECTED_SKILLS) {
      const validation = await validateSkill(skillsDir, skillName);
      validations.push(validation);

      if (!validation.exists) {
        result.warnings!.push(`Missing: ${skillName}.md`);
      } else if (validation.errors.length > 0) {
        result.warnings!.push(`${skillName}: ${validation.errors.join(', ')}`);
      }
    }

    // 4. Check for extra files
    const expectedFiles = new Set(EXPECTED_SKILLS.map(s => `${s}.md`));
    const extraFiles = skillFiles.filter(f => !expectedFiles.has(f));

    if (extraFiles.length > 0) {
      result.details!.push(`Extra files: ${extraFiles.join(', ')}`);
    }

    // 5. Calculate pass/fail
    const existingSkills = validations.filter(v => v.exists);
    const validSkills = validations.filter(v => v.exists && v.errors.length === 0);

    result.details!.push(`Valid: ${validSkills.length}/${EXPECTED_SKILLS.length}`);

    if (existingSkills.length < EXPECTED_SKILLS.length) {
      result.reason = `Missing ${EXPECTED_SKILLS.length - existingSkills.length} skill file(s)`;
    } else if (validSkills.length < existingSkills.length) {
      result.reason = `${existingSkills.length - validSkills.length} skill(s) have validation errors`;
    } else {
      result.passed = true;
      result.details!.push('✓ All skills valid');
    }

    // 6. Add validation details
    const invalidSkills = validations.filter(v => v.exists && v.errors.length > 0);
    if (invalidSkills.length > 0) {
      result.details!.push('\nValidation errors:');
      invalidSkills.forEach(skill => {
        result.details!.push(`  ${skill.name}: ${skill.errors.join(', ')}`);
      });
    }
  } catch (error) {
    result.reason = `Skills check error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

/**
 * Validate individual skill file
 */
async function validateSkill(skillsDir: string, skillName: string): Promise<SkillValidation> {
  const validation: SkillValidation = {
    name: skillName,
    exists: false,
    hasYaml: false,
    hasDescription: false,
    hasExamples: false,
    errors: [],
  };

  const skillPath = join(skillsDir, `${skillName}.md`);

  if (!existsSync(skillPath)) {
    return validation;
  }

  validation.exists = true;

  try {
    const content = await readFile(skillPath, 'utf-8');

    // Check for YAML frontmatter
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (yamlMatch) {
      validation.hasYaml = true;

      const yamlContent = yamlMatch[1];

      // Validate required YAML fields
      if (!yamlContent.includes('name:')) {
        validation.errors.push('Missing name in YAML frontmatter');
      }

      if (!yamlContent.includes('description:')) {
        validation.errors.push('Missing description in YAML frontmatter');
      }

      if (!yamlContent.includes('category:')) {
        validation.errors.push('Missing category in YAML frontmatter');
      }
    } else {
      validation.errors.push('Missing YAML frontmatter');
    }

    // Check for description section
    if (content.includes('## Description') || content.includes('# Description')) {
      validation.hasDescription = true;
    } else {
      validation.errors.push('Missing Description section');
    }

    // Check for examples
    if (content.includes('## Example') || content.includes('```')) {
      validation.hasExamples = true;
    } else {
      validation.warnings = ['No examples found'];
    }

    // Check minimum content length
    if (content.length < 200) {
      validation.errors.push('Content too short (< 200 chars)');
    }

    // Check for required sections
    const requiredSections = ['Usage', 'Features'];
    for (const section of requiredSections) {
      if (!content.includes(`## ${section}`) && !content.includes(`# ${section}`)) {
        validation.errors.push(`Missing ${section} section`);
      }
    }
  } catch (error) {
    validation.errors.push(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
  }

  return validation;
}

/**
 * Get skills info
 */
export async function getSkillsInfo(): Promise<{
  total: number;
  valid: number;
  categories: string[];
}> {
  const skillsDir = join(__dirname, '../skills');

  if (!existsSync(skillsDir)) {
    return { total: 0, valid: 0, categories: [] };
  }

  const files = await readdir(skillsDir);
  const skillFiles = files.filter(f => extname(f) === '.md');

  return {
    total: skillFiles.length,
    valid: 0, // Would need full validation
    categories: ['AgentDB', 'Flow Nexus', 'GitHub'],
  };
}
