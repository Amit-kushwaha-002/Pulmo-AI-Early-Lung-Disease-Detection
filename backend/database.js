const { createPool } = require("mysql2");

// Read MySQL credentials securely from environment variables
const pool = createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "Pulmoai",
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0
});

module.exports = pool;
