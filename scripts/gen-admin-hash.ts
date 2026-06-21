/**
 * Generate a scrypt hash for ADMIN_PASSWORD_HASH.
 * Usage:  npm run gen-admin-hash "your-strong-password"
 * Copy the printed value into .env as ADMIN_PASSWORD_HASH=...
 */
import { hashPassword } from '../backend/auth';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run gen-admin-hash "your-strong-password"');
  process.exit(1);
}

console.log('\nADMIN_PASSWORD_HASH=' + hashPassword(password) + '\n');
console.log('Add the line above to your .env, then remove ADMIN_PASSWORD (plaintext).');
