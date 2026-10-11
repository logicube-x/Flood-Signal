import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

/**
 * Administrative CLI tool to promote a single existing user
 * to an authorized role ('responder' or 'admin').
 *
 * Usage: node promote.js <email> [responder|admin]
 *
 * Security Requirements:
 * - Requires explicit email targeting a single user.
 * - Never modifies multiple accounts or promotes all users.
 * - Confined strictly to server-side CLI execution (never exposed to public HTTP API).
 * - Restricts allowed roles strictly to 'responder' or 'admin'.
 */

const targetEmail = process.argv[2];
const targetRole = process.argv[3] || 'responder';

if (!targetEmail || targetEmail.trim() === '') {
  console.error('Error: Targeted user email is required.');
  console.error('Usage: node promote.js <email> [responder|admin]');
  process.exit(1);
}

const allowedRoles = ['responder', 'admin'];
if (!allowedRoles.includes(targetRole)) {
  console.error(`Error: Invalid role "${targetRole}". Permitted roles: ${allowedRoles.join(', ')}`);
  process.exit(1);
}

async function promoteSingleUser() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI environment variable is not defined.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const normalizedEmail = targetEmail.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.error(`Error: No user found with email "${normalizedEmail}". User must register an account first.`);
      process.exit(1);
    }

    if (user.role === targetRole) {
      console.log(`User ${user.email} already has the "${targetRole}" role.`);
      process.exit(0);
    }

    const previousRole = user.role;
    user.role = targetRole;
    await user.save();

    console.log(`Successfully updated role for ${user.email} from "${previousRole}" to "${targetRole}".`);
    process.exit(0);
  } catch (error) {
    console.error('Promotion error:', error.message);
    process.exit(1);
  }
}

promoteSingleUser();
