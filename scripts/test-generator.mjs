import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateTest(filePath) {
  try {
    const fileName = path.basename(filePath);
    const className = fileName
      .replace('.ts', '')
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const testContent = `
import { ${className} } from '../${fileName}';

describe('${className}', () => {
  let instance: ${className};

  beforeEach(() => {
    instance = ${className}.getInstance();
  });

  it('should be defined', () => {
    expect(instance).toBeDefined();
  });

  it('should be singleton', () => {
    const instance2 = ${className}.getInstance();
    expect(instance).toBe(instance2);
  });
});
`;

    const testDir = path.join(path.dirname(filePath), '__tests__');
    await fs.mkdir(testDir, { recursive: true });

    const testPath = path.join(testDir, `${fileName.replace('.ts', '.test.ts')}`);
    await fs.writeFile(testPath, testContent);

    console.log(`Generated test file: ${testPath}`);
  } catch (error) {
    console.error('Error generating test:', error);
    process.exit(1);
  }
}

// Execute if file path is provided
const filePath = process.argv[2];
if (filePath) {
  generateTest(filePath);
}