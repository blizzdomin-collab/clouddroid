import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(process.cwd(), '.data');
const dbPath = path.join(dbDir, 'clouddroid.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
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

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const now = new Date().toISOString();
    const insertUser = db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, must_change_password, two_factor_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insertUser.run('user_001', 'admin@clouddroid.eu', hashPassword('admin123'), 'Admin User', 'admin', now, 0, 0);

    const insertSubscription = db.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, amount, currency, current_period_start, current_period_end, cancel_at_period_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertSubscription.run('sub_001', 'user_001', 'Professional', 'active', 149, 'USD', now, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), 0, now);

    const insertInstance = db.prepare(`INSERT INTO instances (id, name, platform, ram, storage, status, cpu, memory, network_in, network_out, created_at, updated_at, tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertInstance.run('inst_001', 'QA-Test-Android-14', 'Android 14', 8, 64, 'running', 34, 62, 120, 85, now, now, JSON.stringify(['qa', 'test']), 'Primary QA testing instance');
    insertInstance.run('inst_002', 'Prod-E2E-Android-13', 'Android 13', 4, 32, 'running', 12, 45, 45, 32, now, now, JSON.stringify(['production', 'e2e']), 'End-to-end testing in production');
    insertInstance.run('inst_003', 'Legacy-Test-Android-12', 'Android 12', 4, 32, 'warning', 98, 89, 450, 1200, now, now, JSON.stringify(['legacy', 'test']), 'Legacy app compatibility testing');

    const insertAuditLog = db.prepare(`INSERT INTO audit_logs (id, timestamp, event, severity, instance_id, user_id, details, action) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insertAuditLog.run('log_001', new Date(Date.now() - 1000 * 60 * 5).toISOString(), 'Instance Created', 'info', 'inst_001', 'user_123', 'QA-Test-Android-14 provisioned successfully', 'provision');
    insertAuditLog.run('log_002', new Date(Date.now() - 1000 * 60 * 15).toISOString(), 'High CPU Alert', 'warning', 'inst_003', null, 'CPU usage exceeded 95% threshold for 5 minutes', 'alert');
    insertAuditLog.run('log_003', new Date(Date.now() - 1000 * 60 * 30).toISOString(), 'Instance Suspended', 'critical', 'inst_003', 'system', 'Instance suspended due to AUP violation: cryptocurrency mining detected', 'suspend');
    insertAuditLog.run('log_004', new Date(Date.now() - 1000 * 60 * 60).toISOString(), 'Payment Processed', 'info', null, 'user_123', 'Subscription payment of $149.00 processed via Dodo Payments', 'payment');
    insertAuditLog.run('log_005', new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), 'User Login', 'info', null, 'user_123', 'Successful login from 192.168.1.100', 'login');

    const insertAlert = db.prepare(`INSERT INTO alerts (id, timestamp, type, severity, title, message, instance_id, acknowledged) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insertAlert.run('alert_001', new Date(Date.now() - 1000 * 60 * 2).toISOString(), 'cpu', 'critical', 'Sustained High CPU Usage', 'Instance inst_003 has maintained >95% CPU usage for 5+ minutes. Possible cryptocurrency mining activity.', 'inst_003', 0);
    insertAlert.run('alert_002', new Date(Date.now() - 1000 * 60 * 10).toISOString(), 'network', 'warning', 'Unusual Outbound Traffic', 'Instance inst_003 showing 1200 Mbps outbound traffic. Threshold: 500 Mbps.', 'inst_003', 0);
    insertAlert.run('alert_003', new Date(Date.now() - 1000 * 60 * 30).toISOString(), 'aup', 'critical', 'AUP Violation Detected', 'Automated detection flagged potential resource abuse on inst_003. Instance suspended pending review.', 'inst_003', 1);
    insertAlert.run('alert_004', new Date(Date.now() - 1000 * 60 * 60).toISOString(), 'security', 'info', 'Failed Login Attempts', '3 failed login attempts detected for user_123 from IP 203.0.113.45', null, 1);
    insertAlert.run('alert_005', new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), 'billing', 'info', 'Payment Successful', 'Subscription payment of $149.00 processed for user_123', null, 1);

    const insertInvoice = db.prepare(`INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status, due_date, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertInvoice.run('inv_001', 'user_001', 'sub_001', 149, 'USD', 'paid', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), now, now);
    insertInvoice.run('inv_002', 'user_001', 'sub_001', 149, 'USD', 'paid', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    insertInvoice.run('inv_003', 'user_001', 'sub_001', 149, 'USD', 'paid', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

    const insertMetric = db.prepare(`INSERT INTO metrics_history (id, instance_id, cpu, memory, network_in, network_out, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertMetric.run('metric_001', 'inst_001', 34, 62, 120, 85, new Date(Date.now() - 1000 * 60 * 5).toISOString());
    insertMetric.run('metric_002', 'inst_001', 38, 65, 130, 90, new Date(Date.now() - 1000 * 60 * 10).toISOString());
    insertMetric.run('metric_003', 'inst_001', 30, 60, 110, 80, new Date(Date.now() - 1000 * 60 * 15).toISOString());
    insertMetric.run('metric_004', 'inst_002', 12, 45, 45, 32, new Date(Date.now() - 1000 * 60 * 5).toISOString());
    insertMetric.run('metric_005', 'inst_002', 15, 48, 50, 35, new Date(Date.now() - 1000 * 60 * 10).toISOString());
    insertMetric.run('metric_006', 'inst_003', 98, 89, 450, 1200, new Date(Date.now() - 1000 * 60 * 5).toISOString());
    insertMetric.run('metric_007', 'inst_003', 95, 85, 400, 1100, new Date(Date.now() - 1000 * 60 * 10).toISOString());
  }
}

seedData();

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function getUsers() {
  return db.prepare('SELECT * FROM users').all() as any[];
}

export function getUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any || null;
}

export function getUserById(id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any || null;
}

export function createUser(data: Omit<any, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  const id = `user_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO users (id, email, password_hash, name, role, created_at, reset_token, reset_token_expiry, must_change_password, two_factor_secret, two_factor_backup_codes, two_factor_enabled, dodo_customer_id, registration_ip, registration_user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.email, data.password_hash, data.name, data.role || 'user', now, data.reset_token || null, data.reset_token_expiry || null, data.must_change_password ? 1 : 0, data.two_factor_secret || null, data.two_factor_backup_codes ? JSON.stringify(data.two_factor_backup_codes) : null, data.two_factor_enabled ? 1 : 0, data.dodo_customer_id || null, data.registration_ip || null, data.registration_user_agent || null
  );
  return getUserById(id);
}

export function deleteUser(id: string) {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateUser(id: string, updates: Partial<any>) {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (updates.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(updates.password_hash); }
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
  if (updates.reset_token !== undefined) { fields.push('reset_token = ?'); values.push(updates.reset_token); }
  if (updates.reset_token_expiry !== undefined) { fields.push('reset_token_expiry = ?'); values.push(updates.reset_token_expiry); }
  if (updates.must_change_password !== undefined) { fields.push('must_change_password = ?'); values.push(updates.must_change_password ? 1 : 0); }
  if (updates.two_factor_secret !== undefined) { fields.push('two_factor_secret = ?'); values.push(updates.two_factor_secret); }
  if (updates.two_factor_backup_codes !== undefined) { fields.push('two_factor_backup_codes = ?'); values.push(updates.two_factor_backup_codes ? JSON.stringify(updates.two_factor_backup_codes) : null); }
  if (updates.two_factor_enabled !== undefined) { fields.push('two_factor_enabled = ?'); values.push(updates.two_factor_enabled ? 1 : 0); }
  if (updates.dodo_customer_id !== undefined) { fields.push('dodo_customer_id = ?'); values.push(updates.dodo_customer_id); }
  if (updates.registration_ip !== undefined) { fields.push('registration_ip = ?'); values.push(updates.registration_ip); }
  if (updates.registration_user_agent !== undefined) { fields.push('registration_user_agent = ?'); values.push(updates.registration_user_agent); }
  if (!fields.length) return null;
  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUserById(id);
}

const PLAN_SPECS: Record<string, { instances: number; ram: number; storage: number; platform: string }> = {
  Developer: { instances: 1, ram: 4, storage: 32, platform: 'Android 14' },
  Professional: { instances: 3, ram: 8, storage: 64, platform: 'Android 14' },
  Team: { instances: 10, ram: 16, storage: 128, platform: 'Android 14' },
};

export function provisionInstancesForUser(userId: string, plan: string): any[] {
  const spec = PLAN_SPECS[plan] || PLAN_SPECS['Professional'];
  const now = new Date().toISOString();
  const instances: any[] = [];
  const insertInstance = db.prepare(`INSERT INTO instances (id, name, platform, ram, storage, status, cpu, memory, network_in, network_out, created_at, updated_at, tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertAuditLog = db.prepare(`INSERT INTO audit_logs (id, timestamp, event, severity, instance_id, user_id, details, action) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  for (let i = 0; i < spec.instances; i++) {
    const id = `inst_${Date.now()}_${i}`;
    const instance = {
      id, name: `${plan}-Instance-${i + 1}`, platform: spec.platform, ram: spec.ram, storage: spec.storage,
      status: 'running', cpu: Math.floor(Math.random() * 30) + 5, memory: Math.floor(Math.random() * 40) + 20,
      network_in: Math.floor(Math.random() * 100) + 10, network_out: Math.floor(Math.random() * 100) + 10,
      created_at: now, updated_at: now, tags: JSON.stringify([plan.toLowerCase(), 'provisioned']), notes: `Auto-provisioned for ${plan} plan`
    };
    insertInstance.run(...Object.values(instance));
    instances.push({ ...instance, tags: [plan.toLowerCase(), 'provisioned'] });

    insertAuditLog.run(`log_${Date.now()}_${i}`, now, 'Instance Provisioned', 'info', id, userId, `Instance ${instance.name} provisioned for ${plan} plan`, 'provision');
  }
  return instances;
}

export function verifyResetToken(token: string): { user: any | null; valid: boolean } {
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token) as any || null;
  if (!user || !user.reset_token_expiry) return { user: null, valid: false };
  if (new Date(user.reset_token_expiry) < new Date()) return { user: null, valid: false };
  return { user, valid: true };
}

export function clearResetToken(userId: string) {
  db.prepare('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?').run(userId);
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function getSubscriptions() {
  return db.prepare('SELECT * FROM subscriptions').all() as any[];
}

export function getSubscriptionByUserId(userId: string) {
  return db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as any || null;
}

export function createSubscription(data: Omit<any, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  const id = `sub_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, amount, currency, current_period_start, current_period_end, cancel_at_period_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.user_id, data.plan, data.status, data.amount, data.currency || 'USD', data.current_period_start, data.current_period_end, data.cancel_at_period_end ? 1 : 0, now
  );
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
}

export function updateSubscription(id: string, updates: Partial<any>) {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.plan !== undefined) { fields.push('plan = ?'); values.push(updates.plan); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.amount !== undefined) { fields.push('amount = ?'); values.push(updates.amount); }
  if (updates.currency !== undefined) { fields.push('currency = ?'); values.push(updates.currency); }
  if (updates.current_period_start !== undefined) { fields.push('current_period_start = ?'); values.push(updates.current_period_start); }
  if (updates.current_period_end !== undefined) { fields.push('current_period_end = ?'); values.push(updates.current_period_end); }
  if (updates.cancel_at_period_end !== undefined) { fields.push('cancel_at_period_end = ?'); values.push(updates.cancel_at_period_end ? 1 : 0); }
  if (!fields.length) return null;
  values.push(id);
  db.prepare(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
}

export function getInvoices(userId?: string) {
  if (userId) return db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(userId) as any[];
  return db.prepare('SELECT * FROM invoices').all() as any[];
}

export function getInvoiceById(id: string) {
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any || null;
}

export function createInvoice(data: Omit<any, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  const id = `inv_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status, due_date, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.user_id, data.subscription_id, data.amount, data.currency || 'USD', data.status || 'pending', data.due_date, data.paid_at || null, now
  );
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
}

export function getMetricsHistory(instanceId?: string) {
  if (instanceId) return db.prepare('SELECT * FROM metrics_history WHERE instance_id = ?').all(instanceId) as any[];
  return db.prepare('SELECT * FROM metrics_history').all() as any[];
}

export function addMetricHistory(data: Omit<any, 'id' | 'timestamp'>) {
  const now = new Date().toISOString();
  const id = `metric_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO metrics_history (id, instance_id, cpu, memory, network_in, network_out, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.instance_id, data.cpu, data.memory, data.network_in, data.network_out, now
  );
  return db.prepare('SELECT * FROM metrics_history WHERE id = ?').get(id) as any;
}

export function getInstances() {
  return db.prepare('SELECT * FROM instances').all() as any[];
}

export function getInstanceById(id: string) {
  return db.prepare('SELECT * FROM instances WHERE id = ?').get(id) as any || null;
}

export function createInstance(data: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
  const now = new Date().toISOString();
  const id = `inst_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO instances (id, name, platform, ram, storage, status, cpu, memory, network_in, network_out, created_at, updated_at, tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.name, data.platform, data.ram, data.storage, data.status, data.cpu || 0, data.memory || 0, data.network_in || 0, data.network_out || 0, now, now, JSON.stringify(data.tags || []), data.notes || ''
  );
  return getInstanceById(id);
}

export function updateInstance(id: string, updates: Partial<any>) {
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.platform !== undefined) { fields.push('platform = ?'); values.push(updates.platform); }
  if (updates.ram !== undefined) { fields.push('ram = ?'); values.push(updates.ram); }
  if (updates.storage !== undefined) { fields.push('storage = ?'); values.push(updates.storage); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.cpu !== undefined) { fields.push('cpu = ?'); values.push(updates.cpu); }
  if (updates.memory !== undefined) { fields.push('memory = ?'); values.push(updates.memory); }
  if (updates.network_in !== undefined) { fields.push('network_in = ?'); values.push(updates.network_in); }
  if (updates.network_out !== undefined) { fields.push('network_out = ?'); values.push(updates.network_out); }
  if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  values.push(id);
  db.prepare(`UPDATE instances SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getInstanceById(id);
}

export function deleteInstance(id: string) {
  const result = db.prepare('DELETE FROM instances WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getAuditLogs() {
  return db.prepare('SELECT * FROM audit_logs').all() as any[];
}

export function createAuditLog(data: Omit<any, 'id' | 'timestamp'>) {
  const now = new Date().toISOString();
  const id = `log_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO audit_logs (id, timestamp, event, severity, instance_id, user_id, details, action) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, now, data.event, data.severity, data.instance_id || null, data.user_id || null, data.details, data.action
  );
  return db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as any;
}

export function getAlerts() {
  return db.prepare('SELECT * FROM alerts').all() as any[];
}

export function acknowledgeAlert(alertId: string) {
  const result = db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(alertId);
  return result.changes > 0;
}

export function createCheckoutSession(data: Omit<any, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  const id = `cs_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO checkout_sessions (id, session_id, email, plan, status, temp_password, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.session_id, data.email, data.plan, data.status || 'pending', data.temp_password || null, data.ip_address || null, data.user_agent || null, now
  );
  return db.prepare('SELECT * FROM checkout_sessions WHERE id = ?').get(id) as any;
}

export function getCheckoutSessionBySessionId(sessionId: string) {
  return db.prepare('SELECT * FROM checkout_sessions WHERE session_id = ?').get(sessionId) as any || null;
}

export function updateCheckoutSession(id: string, updates: Partial<any>) {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.session_id !== undefined) { fields.push('session_id = ?'); values.push(updates.session_id); }
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (updates.plan !== undefined) { fields.push('plan = ?'); values.push(updates.plan); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.temp_password !== undefined) { fields.push('temp_password = ?'); values.push(updates.temp_password); }
  if (updates.ip_address !== undefined) { fields.push('ip_address = ?'); values.push(updates.ip_address); }
  if (updates.user_agent !== undefined) { fields.push('user_agent = ?'); values.push(updates.user_agent); }
  if (!fields.length) return null;
  values.push(id);
  db.prepare(`UPDATE checkout_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM checkout_sessions WHERE id = ?').get(id) as any;
}

export function getCheckoutSessionByEmail(email: string) {
  return db.prepare('SELECT * FROM checkout_sessions WHERE email = ?').get(email) as any || null;
}

export function getNotificationChannels(userId: string) {
  return db.prepare('SELECT * FROM notification_channels WHERE user_id = ?').all(userId) as any[];
}

export function createNotificationChannel(data: Omit<any, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  const id = `nc_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO notification_channels (id, user_id, type, name, config, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.user_id, data.type, data.name, JSON.stringify(data.config || {}), data.enabled ? 1 : 0, now
  );
  return db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id) as any;
}

export function updateNotificationChannel(id: string, updates: Partial<any>) {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(updates.config)); }
  if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
  if (!fields.length) return null;
  values.push(id);
  db.prepare(`UPDATE notification_channels SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id) as any;
}

export function deleteNotificationChannel(id: string) {
  const result = db.prepare('DELETE FROM notification_channels WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createSession(data: Omit<any, 'id' | 'created_at' | 'last_used_at'>) {
  const now = new Date().toISOString();
  const id = `sess_${String(Date.now()).slice(-3)}`;
  db.prepare(`INSERT INTO sessions (id, user_id, token, ip_address, user_agent, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, data.user_id, data.token, data.ip_address || null, data.user_agent || null, now, now
  );
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
}

export function getSessionsByUserId(userId: string) {
  return db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
}

export function getSessionById(id: string) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any || null;
}

export function getSessionByToken(token: string) {
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as any || null;
}

export function updateSession(id: string, updates: Partial<any>) {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.token !== undefined) { fields.push('token = ?'); values.push(updates.token); }
  if (updates.ip_address !== undefined) { fields.push('ip_address = ?'); values.push(updates.ip_address); }
  if (updates.user_agent !== undefined) { fields.push('user_agent = ?'); values.push(updates.user_agent); }
  if (updates.last_used_at !== undefined) { fields.push('last_used_at = ?'); values.push(updates.last_used_at); }
  if (!fields.length) return null;
  values.push(id);
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
}

export function deleteSession(id: string) {
  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function deleteSessionsByUserId(userId: string) {
  const result = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return result.changes > 0;
}

export function saveToDisk() {
  // SQLite persists automatically; no-op for compatibility
}

export interface Instance {
  id: string;
  name: string;
  platform: string;
  ram: number;
  storage: number;
  status: string;
  cpu: number;
  memory: number;
  network_in: number;
  network_out: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  notes: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  severity: string;
  instance_id: string | null;
  user_id: string | null;
  details: string;
  action: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  instance_id: string | null;
  acknowledged: number;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
  reset_token: string | null;
  reset_token_expiry: string | null;
  must_change_password: boolean;
  two_factor_secret: string | null;
  two_factor_backup_codes: string[] | null;
  two_factor_enabled: boolean;
  dodo_customer_id: string | null;
  registration_ip: string | null;
  registration_user_agent: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

export interface MetricHistory {
  id: string;
  instance_id: string;
  cpu: number;
  memory: number;
  network_in: number;
  network_out: number;
  timestamp: string;
}

export interface CheckoutSession {
  id: string;
  session_id: string;
  email: string;
  plan: string;
  status: 'pending' | 'completed' | 'failed';
  temp_password: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface NotificationChannel {
  id: string;
  user_id: string;
  type: 'email' | 'slack' | 'webhook';
  name: string;
  config: Record<string, string>;
  enabled: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
}

export default db;