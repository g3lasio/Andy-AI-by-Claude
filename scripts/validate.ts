
import { ESLint } from 'eslint';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as notifier from 'node-notifier';

const execAsync = promisify(exec);

async function notifyResult(title: string, message: string, success: boolean) {
  notifier.notify({
    title,
    message,
    icon: success ? '✅' : '❌',
    sound: true,
  });
}

async function runValidations() {
  try {
    // TypeScript type checking
    console.log('Running TypeScript checks...');
    await execAsync('tsc --noEmit');
    await notifyResult('TypeScript', 'TypeScript checks passed', true);

    // ESLint with auto-fix
    console.log('Running ESLint with auto-fix...');
    const eslint = new ESLint({ fix: true });
    const results = await eslint.lintFiles(['src/**/*.{ts,tsx}']);
    await ESLint.outputFixes(results);
    const formatter = await eslint.loadFormatter('stylish');
    console.log(formatter.format(results));

    const hasErrors = results.some(result => result.errorCount > 0);
    if (hasErrors) {
      await notifyResult('ESLint', 'ESLint found errors', false);
      throw new Error('ESLint checks failed');
    }

    // Run Jest tests
    console.log('Running Jest tests...');
    await execAsync('jest --coverage --detectOpenHandles');
    await notifyResult('Jest', 'All tests passed', true);

    // Run Vitest tests
    console.log('Running Vitest tests...');
    await execAsync('vitest run --coverage');
    await notifyResult('Vitest', 'All tests passed', true);

    // Memory leak detection
    console.log('Checking for memory leaks...');
    await execAsync('node --heap-prof scripts/memory-check.js');

    console.log('All validations passed successfully!');
  } catch (error) {
    console.error('Validation failed:', error);
    await notifyResult('Validation Error', error.message, false);
    process.exit(1);
  }
}

runValidations();
