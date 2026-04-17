const mysql = require('mysql2');
require('dotenv').config({ path: '../.env' });

async function updatePasswords() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'scholargrid',
    port: process.env.DB_PORT || 3306
  }).promise();

  try {
    // Admin
    await pool.execute('UPDATE profiles SET password_hash = ? WHERE email = ?', ['$2a$10$X/7vdT8VrVtkKw5cVWs6u.ipGqBwW3dhEaS2gUJY3O5P8pWfF9Cw.', 'admin@scholargrid.com']);
    // Faculty
    await pool.execute('UPDATE profiles SET password_hash = ? WHERE email = ?', ['$2a$10$XJ4WbwtQID2Os3t8dI0SLOle2EtaZbilb0.2hK/sjmK5D586resoy.', 'faculty@scholargrid.com']);
    // Students
    const studentEmails = ['alice@student.com', 'bob@student.com', 'carol@student.com', 'dave@student.com', 'eve@student.com'];
    for (const email of studentEmails) {
      await pool.execute('UPDATE profiles SET password_hash = ? WHERE email = ?', ['$2a$10$mNXIDlRNRHGae9okF1GNQ.sGKXKfTTaNlr2kGQlfGCSmgnYTgl4au', email]);
    }
    console.log('Successfully updated seed user passwords in DB.');
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await pool.end();
  }
}

updatePasswords();
