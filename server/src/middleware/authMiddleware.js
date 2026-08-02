import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { users } from '../config/schema.js';

export const protect = async (req, res, next) => {
  let token;

  // Check Authorization header for Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database, excluding password
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          college: users.college,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: 'Not authorized, user not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }
};

export default protect;
