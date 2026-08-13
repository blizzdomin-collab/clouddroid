import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(process.cwd(), '.data', 'clouddroid.json');
const dbPath = path.join(process.cwd(), '.data', 'clouddroid.db');

if (!fs.existsSync(jsonPath)) {
  console.log('No JSON database found. Skipping migration.');
  process.exit(0);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL,
    reset_token TEXT,
    reset_token_expiry TEXT,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    two_factor_secret TEXT,
    two_factor_backup_codes TEXT,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    dodo_customer_id TEXT,
    registration_ip TEXT,
    registration_user_agent TEXT
  );

  CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    ram INTEGER NOT NULL,
    storage INTEGER NOT NULL,
    status TEXT NOT NULL,
    cpu INTEGER NOT NULL DEFAULT 0,
    memory INTEGER NOT NULL DEFAULT 0,
    network_in INTEGER NOT NULL DEFAULT 0,
    network_out INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    due_date TEXT NOT NULL,
    paid_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS metrics_history (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    cpu INTEGER NOT NULL,
    memory INTEGER NOT NULL,
    network_in INTEGER NOT NULL,
    network_out INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event TEXT NOT NULL,
    severity TEXT NOT NULL,
    instance_id TEXT,
    user_id TEXT,
    details TEXT NOT NULL,
    action TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    instance_id TEXT,
    acknowledged INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS checkout_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    temp_password TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notification_channels (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
  CREATE INDEX IF NOT EXISTS idx_metrics_instance_id ON metrics_history(instance_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
  CREATE INDEX IF NOT EXISTS idx_checkout_sessions_email ON checkout_sessions(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
`);

const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const tables = ['users', 'instances', 'subscriptions', 'invoices', 'metrics_history', 'audit_logs', 'alerts', 'checkout_sessions', 'notification_channels', 'sessions'];
for (const table of tables) {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
  if (count.count > 0) {
    console.log(`SQLite database already has data in ${table}. Skipping migration.`);
    process.exit(0);
  }
}

console.log('Migrating JSON data to SQLite...');

const insertUser = db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, reset_token, reset_token_expiry, must_change_password, two_factor_secret, two_factor_backup_codes, two_factor_enabled, dodo_customer_id, registration_ip, registration_user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const user of jsonData.users || []) {
  insertUser.run(user.id, user.email, user.password_hash, user.name, user.role, user.created_at, user.reset_token || null, user.reset_token_expiry || null, user.must_change_password ? 1 : 0, user.two_factor_secret || null, user.two_factor_backup_codes ? JSON.stringify(user.two_factor_backup_codes) : null, user.two_factor_enabled ? 1 : 0, user.dodo_customer_id || null, user.registration_ip || null, user.registration_user_agent || null);
}

const insertInstance = db.prepare(`INSERT INTO instances (id, name, platform, ram, storage, status, cpu, memory, network_in, network_out, created_at, updated_at, tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const instance of jsonData.instances || []) {
  insertInstance.run(instance.id, instance.name, instance.platform, instance.ram, instance.storage, instance.status, instance.cpu, instance.memory, instance.network_in, instance.network_out, instance.created_at, instance.updated_at, JSON.stringify(instance.tags || []), instance.notes || '');
}

const insertSubscription = db.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, amount, currency, current_period_start, current_period_end, cancel_at_period_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const sub of jsonData.subscriptions || []) {
  insertSubscription.run(sub.id, sub.user_id, sub.plan, sub.status, sub.amount, sub.currency || 'USD', sub.current_period_start, sub.current_period_end, sub.cancel_at_period_end ? 1 : 0, sub.created_at);
}

const insertInvoice = db.prepare(`INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status, due_date, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const invoice of jsonData.invoices || []) {
  insertInvoice.run(invoice.id, invoice.user_id, invoice.subscription_id, invoice.amount, invoice.currency || 'USD', invoice.status || 'pending', invoice.due_date, invoice.paid_at || null, invoice.created_at);
}

const insertMetric = db.prepare(`INSERT INTO metrics_history (id, instance_id, cpu, memory, network_in, network_out, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`);
for (const metric of jsonData.metrics_history || []) {
  insertMetric.run(metric.id, metric.instance_id, metric.cpu, metric.memory, metric.network_in, metric.network_out, metric.timestamp);
}

const insertAuditLog = db.prepare(`INSERT INTO audit_logs (id, timestamp, event, severity, instance_id, user_id, details, action) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
for (const log of jsonData.audit_logs || []) {
  insertAuditLog.run(log.id, log.timestamp, log.event, log.severity, log.instance_id || null, log.user_id || null, log.details, log.action);
}

const insertAlert = db.prepare(`INSERT INTO alerts (id, timestamp, type, severity, title, message, instance_id, acknowledged) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
for (const alert of jsonData.alerts || []) {
  insertAlert.run(alert.id, alert.timestamp, alert.type, alert.severity, alert.title, alert.message, alert.instance_id || null, alert.acknowledged || 0);
}

const insertCheckoutSession = db.prepare(`INSERT INTO checkout_sessions (id, session_id, email, plan, status, temp_password, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const session of jsonData.checkout_sessions || []) {
  insertCheckoutSession.run(session.id, session.session_id, session.email, session.plan, session.status || 'pending', session.temp_password || null, session.ip_address || null, session.user_agent || null, session.created_at);
}

const insertNotificationChannel = db.prepare(`INSERT INTO notification_channels (id, user_id, type, name, config, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
for (const channel of jsonData.notification_channels || []) {
  insertNotificationChannel.run(channel.id, channel.user_id, channel.type, channel.name, JSON.stringify(channel.config || {}), channel.enabled ? 1 : 0, channel.created_at);
}

const insertSession = db.prepare(`INSERT INTO sessions (id, user_id, token, ip_address, user_agent, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
for (const session of jsonData.sessions || []) {
  insertSession.run(session.id, session.user_id, session.token, session.ip_address || null, session.user_agent || null, session.created_at, session.last_used_at);
}

const backupPath = jsonPath + '.bak';
fs.renameSync(jsonPath, backupPath);
console.log(`Migration complete. JSON backup saved to ${backupPath}`);
console.log('You can delete the backup file after verifying the SQLite database works correctly.');
