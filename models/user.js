/** User class for message.ly */
const { BCRYPT_WORK_FACTOR } = require('../config');
const bcrypt = require('bcrypt');
const db = require('../db');
const ExpressError = require('../expressError');


/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) { 
    const hashedPassword = await bcrypt.hash(password,BCRYPT_WORK_FACTOR);
    const results = await db.query(`
      INSERT INTO users 
      (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES
      ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
      RETURNING username, password, first_name, last_name, phone
      `,[username, hashedPassword, first_name, last_name, phone]);
    if (results.rows.length > 0) {
      return results.rows[0];
    } else {
      throw new ExpressError('Error registering user', 400);
    };
  }
  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 
    const results = await db.query(`
      SELECT * FROM users 
      WHERE username = $1
    `,[username]);
    if (results.rows.length > 0) {
      const user = results.rows[0];
      return bcrypt.compare(password,user.password);
    }
    throw new ExpressError('Error authenticating user', 400);
  }
  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) { 
    await db.query(`
      UPDATE users 
      SET last_login_at = current_timestamp
      WHERE username = $1
    `,[username]);
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() { 
    const results = await db.query(`
      SELECT username, first_name, last_name, phone 
      FROM users
      `);
    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) { 
    const results = await db.query(`
      SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users
      WHERE username = $1
    `,[username]);
    if (results.rows.length > 0) {
      return results.rows[0];
    } else {
      throw new ExpressError(`Could not retrieve user ${username}`, 400)
    }

  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 
    const results = await db.query(`
      SELECT id, to_username, body, sent_at, read_at
      FROM messages
      JOIN users ON messages.from_username = users.username
      WHERE username = $1
    `,[username]);
    const messagePromises = results.rows.map(async m => {
      const {username, first_name, last_name, phone} = await User.get(m.to_username);
      return {
        id: m.id, 
        to_user: {username, first_name, last_name, phone},
        body: m.body, 
        sent_at: m.sent_at, 
        read_at: m.read_at
      };
    });
    const messages = Promise.all(messagePromises);
    return messages;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) { 
    const results = await db.query(`
      SELECT id, from_username, body, sent_at, read_at
      FROM messages
      JOIN users ON messages.to_username = users.username
      WHERE username = $1
    `,[username]);
    const messagePromises = results.rows.map(async m => {
      const {username, first_name, last_name, phone} = await User.get(m.from_username);
      return {
        id: m.id, 
        from_user: {username, first_name, last_name, phone},
        body: m.body, 
        sent_at: m.sent_at, 
        read_at: m.read_at
      };
    });
    const messages = Promise.all(messagePromises);
    return messages;
  }
}


module.exports = User;