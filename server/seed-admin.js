// Creates the admin account. Run once: node seed-admin.js
import { db } from './db.js';
import { User } from './user.js';

const { user, errors } = await User.signup('admin', 'admin-password');
if (!user) throw new Error(errors.join(' '));
db.prepare('UPDATE user SET admin = 1 WHERE id = ?').run(user.id);
