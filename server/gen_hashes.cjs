const bcrypt = require('bcryptjs');

async function gen() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const facultyHash = await bcrypt.hash('faculty123', 10);
  const studentHash = await bcrypt.hash('student123', 10);
  console.log(`admin123 hash: ${adminHash}`);
  console.log(`faculty123 hash: ${facultyHash}`);
  console.log(`student123 hash: ${studentHash}`);
}

gen();
