import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Admin Provisioned Responder';

if (!email || !password) {
  console.log('Usage: node provision-responder.js <email> <password> [name]');
  process.exit(1);
}

async function provision() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.role = 'responder';
      await existing.save();
      console.log(`Promoted existing user ${email} to responder.`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const user = new User({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'responder'
      });
      await user.save();
      console.log(`Provisioned new responder account for ${email}.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Provisioning failed:', err);
    process.exit(1);
  }
}

provision();
