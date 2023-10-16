import { createAdminUser } from "./src/utils/auth.js";
import Database from "better-sqlite3";
import dotenv from "dotenv";
dotenv.config();

function checkIfTableExists(tableName) {
  const tableExistsStatement = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ?;`,
  );

  const tableExistsResult = tableExistsStatement.get(tableName);

  return tableExistsResult !== undefined;
}

const db = new Database("sqlite.db", { verbose: console.log });
db.pragma("journal_mode = WAL");

async function initialise() {
  const creatingUsersTable = !checkIfTableExists("users");

  if (creatingUsersTable) {
    const createUsersStatement = db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  approved_at TIMESTAMP NULL,
  password TEXT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

    console.log("Creating users table");
    createUsersStatement.run();

    console.log("Inserting admin user");
    const adminName = process.env.APP_ADMIN_NAME;
    const adminEmail = process.env.APP_ADMIN_EMAIL;
    const adminPassword = process.env.APP_ADMIN_PASSWORD;
    await createAdminUser(adminName, adminEmail, adminPassword);
  }

  const createTableStatements = [
    `CREATE TABLE IF NOT EXISTS notes (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
	title TEXT NOT NULL,
	body TEXT,
	status TEXT,
	processed_at DATE,
  progress INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
	);`,
  ];

  createTableStatements.forEach((statement) => {
    db.exec(statement);
  });

  db.close();
}

initialise();
