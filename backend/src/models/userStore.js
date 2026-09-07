/**
 * In-Memory User Store
 * Provides findByEmail/findById/create/toPublicUser, mirroring the
 * shape of a future Mongoose model so this can be swapped for
 * MongoDB persistence in Part 2 with minimal controller changes.
 * toPublicUser() ensures the password hash is never exposed
 * outside the auth layer.
 */

const crypto = require('crypto');

/**
 * Part 1 uses in-memory storage as permitted by the brief.
 * The access pattern here (findByEmail / create / findById) mirrors
 * what a Mongoose model will expose in Part 2, so swapping this out
 * for a real MongoDB-backed model later requires minimal changes
 * to the controllers.
 */
const users = [];

function findByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findById(id) {
  return users.find((u) => u.id === id);
}

function create({ name, email, passwordHash, role }) {
  const user = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role || 'client', // client | freelancer | admin
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

// Never expose the password hash outside the auth layer.
function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

module.exports = { findByEmail, findById, create, toPublicUser };
