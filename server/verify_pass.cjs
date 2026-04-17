const bcrypt = require('bcryptjs');

async function verify() {
  const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const password = 'admin123';
  const match = await bcrypt.compare(password, hash);
  console.log(`Password 'admin123' matches hash: ${match}`);
}

verify();
