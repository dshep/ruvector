import ora, { Ora } from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';

export type OutputFormat = 'json' | 'table' | 'plain';

/**
 * Format and output data based on specified format
 */
export function formatOutput(data: any, format: OutputFormat = 'table'): void {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(data, null, 2));
      break;
    case 'table':
      formatTable(data);
      break;
    case 'plain':
      formatPlain(data);
      break;
    default:
      console.log(data);
  }
}

/**
 * Format data as a table
 */
function formatTable(data: any): void {
  if (!data) {
    console.log(chalk.yellow('No data to display'));
    return;
  }

  // Handle arrays of objects
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log(chalk.yellow('No results found'));
      return;
    }

    const keys = Object.keys(data[0]);
    const table = new Table({
      head: keys.map(k => chalk.cyan(k)),
      style: {
        head: [],
        border: [],
      },
    });

    data.forEach(row => {
      table.push(keys.map(k => formatValue(row[k])));
    });

    console.log(table.toString());
    return;
  }

  // Handle single object
  if (typeof data === 'object') {
    const table = new Table({
      style: {
        head: [],
        border: [],
      },
    });

    Object.entries(data).forEach(([key, value]) => {
      table.push({
        [chalk.cyan(key)]: formatValue(value),
      });
    });

    console.log(table.toString());
    return;
  }

  // Handle primitive values
  console.log(data);
}

/**
 * Format data as plain text
 */
function formatPlain(data: any): void {
  if (!data) {
    console.log('No data');
    return;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      console.log(`\n${chalk.bold(`[${index + 1}]`)}`);
      printObject(item, 0);
    });
    return;
  }

  if (typeof data === 'object') {
    printObject(data, 0);
    return;
  }

  console.log(data);
}

/**
 * Print object with indentation
 */
function printObject(obj: any, indent: number): void {
  const spaces = '  '.repeat(indent);

  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log(`${spaces}${chalk.cyan(key)}:`);
      printObject(value, indent + 1);
    } else if (Array.isArray(value)) {
      console.log(`${spaces}${chalk.cyan(key)}: ${chalk.gray('[')}`);
      value.forEach((item, index) => {
        if (typeof item === 'object') {
          console.log(`${spaces}  ${chalk.gray(`[${index}]`)}`);
          printObject(item, indent + 2);
        } else {
          console.log(`${spaces}  ${formatValue(item)}`);
        }
      });
      console.log(`${spaces}${chalk.gray(']')}`);
    } else {
      console.log(`${spaces}${chalk.cyan(key)}: ${formatValue(value)}`);
    }
  });
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === null) return chalk.gray('null');
  if (value === undefined) return chalk.gray('undefined');
  if (typeof value === 'boolean') return value ? chalk.green('true') : chalk.red('false');
  if (typeof value === 'number') return chalk.yellow(value.toString());
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Spinner utility for async operations
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  successText?: string
): Promise<T> {
  const spinner = ora({
    text,
    color: 'cyan',
  }).start();

  try {
    const result = await fn();
    spinner.succeed(successText || text);
    return result;
  } catch (error) {
    spinner.fail(`${text} failed`);
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red(`Error: ${String(error)}`));
    }
    process.exit(1);
  }
}

/**
 * Progress bar utility
 */
export class ProgressBar {
  private spinner: Ora;
  private total: number;
  private current: number = 0;

  constructor(text: string, total: number) {
    this.total = total;
    this.spinner = ora({
      text: `${text} (0/${total})`,
      color: 'cyan',
    }).start();
  }

  increment(amount: number = 1): void {
    this.current += amount;
    const percentage = Math.round((this.current / this.total) * 100);
    this.spinner.text = `${this.spinner.text.split('(')[0]}(${this.current}/${this.total}) ${percentage}%`;
  }

  complete(text?: string): void {
    this.spinner.succeed(text || `Completed (${this.total}/${this.total})`);
  }

  fail(text?: string): void {
    this.spinner.fail(text || 'Failed');
  }
}

/**
 * Display success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Display error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Display warning message
 */
export function warning(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Display info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Display debug message (only if DEBUG env var is set)
 */
export function debug(message: string): void {
  if (process.env.DEBUG) {
    console.log(chalk.gray('🔍'), chalk.gray(message));
  }
}
