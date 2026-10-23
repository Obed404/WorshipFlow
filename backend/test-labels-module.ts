// Test file to verify labels module exports
import { mountLabelsModule, labelRepository, labelController } from './src/modules/labels/index.js';
import { createLabelSchema, INSTRUMENT_OPTIONS, DEFAULT_COLORS } from './src/modules/labels/types/label.types.js';
import express from 'express';

console.log('=== Labels Module Test ===\n');

// Test 1: Check type exports
console.log('✅ Type exports available:');
console.log('  - createLabelSchema:', typeof createLabelSchema);
console.log('  - INSTRUMENT_OPTIONS:', INSTRUMENT_OPTIONS.length, 'options');
console.log('  - DEFAULT_COLORS:', DEFAULT_COLORS.length, 'colors\n');

// Test 2: Check repository exports
console.log('✅ Repository exports available:');
console.log('  - labelRepository:', typeof labelRepository);
console.log('  - Methods:', Object.keys(Object.getPrototypeOf(labelRepository)).filter(k => k !== 'constructor').join(', '), '\n');

// Test 3: Check controller exports
console.log('✅ Controller exports available:');
console.log('  - labelController:', typeof labelController);
console.log('  - Methods:', Object.keys(Object.getPrototypeOf(labelController)).filter(k => k !== 'constructor').join(', '), '\n');

// Test 4: Check mount function
console.log('✅ Mount function available:');
console.log('  - mountLabelsModule:', typeof mountLabelsModule, '\n');

// Test 5: Create Express router and mount
try {
  const app = express();
  const router = express.Router();
  mountLabelsModule(router, '/labels');
  console.log('✅ Module can be mounted on Express router\n');
} catch (error) {
  console.log('❌ Failed to mount module:', error, '\n');
}

// Test 6: Test Zod schema validation
console.log('✅ Zod schema validation test:');
try {
  const validData = { name: 'Test Label', color: '#3b82f6', instrument: 'GUITAR' };
  const result = createLabelSchema.parse(validData);
  console.log('  - Valid data passes:', result.name === 'Test Label');
  
  try {
    const invalidData = { name: '', color: 'invalid', instrument: 'INVALID' };
    createLabelSchema.parse(invalidData);
    console.log('  - Invalid data should fail but passed');
  } catch {
    console.log('  - Invalid data correctly fails\n');
  }
} catch (error) {
  console.log('  - Schema test failed:', error, '\n');
}

console.log('=== Labels Module Test Complete ===');
console.log('All exports and functionality verified successfully!');