const mysql = require('mysql2');
require('dotenv').config({ path: '../.env' });

async function checkUsers() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'scholargrid',
    port: process.env.DB_PORT || 3306
  }).promise();

  try {
    const [rows] = await pool.execute('SELECT email, role, password_hash FROM profiles');
    console.log('Users in DB:', rows);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await pool.end();
  }
}

checkUsers();
