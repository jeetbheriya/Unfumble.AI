import { parseResume } from './src/modules/resume-parser/parser.js';
import fs from 'fs';

async function test() {
  try {
    const buffer = fs.readFileSync('test.pdf');
    const text = await parseResume(buffer);
    console.log('Extracted text:', text);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Create a dummy PDF if it doesn't exist? No, I'll just check if the import works.
console.log('Testing import of parseResume...');
try {
  console.log('parseResume is defined:', typeof parseResume);
} catch (e) {
  console.error('Import failed:', e);
}
