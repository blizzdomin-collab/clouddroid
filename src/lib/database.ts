import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(process.cwd(), '.data', 'clouddroid.json');

interface Instance {
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

interface AuditLog {
  id: string;
  timestamp: string;
  event: string;
  severity: string;
  instance_id: string | null;
  user_id: string | null;
  details: string;
  action: string;
}

interface Alert {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  instance_id: string | null;
  acknowledged: number;
}

interface User {
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
}

interface Subscription {
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

interface Invoice {
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

interface MetricHistory {
  id: string;
  instance_id: string;
  cpu: number;
  memory: number;
  network_in: number;
  network_out: number;
  timestamp: string;
}

interface CheckoutSession {
  id: string;
  session_id: string;
  email: string;
  plan: string;
  status: 'pending' | 'completed' | 'failed';
  temp_password: string | null;
  created_at: string;
}

interface NotificationChannel {
  id: string;
  user_id: string;
  type: 'email' | 'slack' | 'webhook';
  name: string;
  config: Record<string, string>;
  enabled: boolean;
  created_at: string;
}

interface Database {
  instances: Instance[];
  audit_logs: AuditLog[];
  alerts: Alert[];
  users: User[];
  subscriptions: Subscription[];
  metrics_history: MetricHistory[];
  invoices: Invoice[];
  checkout_sessions: CheckoutSession[];
  notification_channels: NotificationChannel[];
}

let db: Database = {
  instances: [],
  audit_logs: [],
  alerts: [],
  users: [],
  subscriptions: [],
  metrics_history: [],
  invoices: [],
  checkout_sessions: [],
  notification_channels: [],
};

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function loadDatabase(): Database {
  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

function saveDatabase(data: Database) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function initDatabase() {
  const existing = loadDatabase();
  if (existing) {
    db = {
      instances: existing.instances || [],
      audit_logs: existing.audit_logs || [],
      alerts: existing.alerts || [],
      users: existing.users || [],
      subscriptions: existing.subscriptions || [],
      metrics_history: existing.metrics_history || [],
      invoices: existing.invoices || [],
      checkout_sessions: existing.checkout_sessions || [],
      notification_channels: existing.notification_channels || [],
    };
    if (!db.users.length) {
      const now = new Date().toISOString();
      db.users.push({
        id: 'user_001',
        email: 'admin@clouddroid.eu',
        password_hash: hashPassword('admin123'),
        name: 'Admin User',
        role: 'admin',
        created_at: now,
        reset_token: null,
        reset_token_expiry: null,
        must_change_password: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        two_factor_enabled: false,
      });
    }
    if (!db.subscriptions.length) {
      const now = new Date().toISOString();
      db.subscriptions.push({
        id: 'sub_001',
        user_id: 'user_001',
        plan: 'Professional',
        status: 'active',
        amount: 149,
        currency: 'USD',
        current_period_start: now,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        created_at: now,
      });
    }
    if (!db.metrics_history.length) {
      const now = new Date().toISOString();
      db.metrics_history = [
        { id: 'metric_001', instance_id: 'inst_001', cpu: 34, memory: 62, network_in: 120, network_out: 85, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 'metric_002', instance_id: 'inst_001', cpu: 38, memory: 65, network_in: 130, network_out: 90, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
        { id: 'metric_003', instance_id: 'inst_001', cpu: 30, memory: 60, network_in: 110, network_out: 80, timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
        { id: 'metric_004', instance_id: 'inst_002', cpu: 12, memory: 45, network_in: 45, network_out: 32, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 'metric_005', instance_id: 'inst_002', cpu: 15, memory: 48, network_in: 50, network_out: 35, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
        { id: 'metric_006', instance_id: 'inst_003', cpu: 98, memory: 89, network_in: 450, network_out: 1200, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 'metric_007', instance_id: 'inst_003', cpu: 95, memory: 85, network_in: 400, network_out: 1100, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
      ];
    }
    if (!db.invoices.length) {
      const now = new Date().toISOString();
      db.invoices = [
        { id: 'inv_001', user_id: 'user_001', subscription_id: 'sub_001', amount: 149, currency: 'USD', status: 'paid', due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), paid_at: now, created_at: now },
        { id: 'inv_002', user_id: 'user_001', subscription_id: 'sub_001', amount: 149, currency: 'USD', status: 'paid', due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), paid_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'inv_003', user_id: 'user_001', subscription_id: 'sub_001', amount: 149, currency: 'USD', status: 'paid', due_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), paid_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
      ];
    }
    saveDatabase(db);
    return;
  }

  const now = new Date().toISOString();
  db = {
    instances: [
      { id: 'inst_001', name: 'QA-Test-Android-14', platform: 'Android 14', ram: 8, storage: 64, status: 'running', cpu: 34, memory: 62, network_in: 120, network_out: 85, created_at: now, updated_at: now, tags: ['qa', 'test'], notes: 'Primary QA testing instance' },
      { id: 'inst_002', name: 'Prod-E2E-Android-13', platform: 'Android 13', ram: 4, storage: 32, status: 'running', cpu: 12, memory: 45, network_in: 45, network_out: 32, created_at: now, updated_at: now, tags: ['production', 'e2e'], notes: 'End-to-end testing in production' },
      { id: 'inst_003', name: 'Legacy-Test-Android-12', platform: 'Android 12', ram: 4, storage: 32, status: 'warning', cpu: 98, memory: 89, network_in: 450, network_out: 1200, created_at: now, updated_at: now, tags: ['legacy', 'test'], notes: 'Legacy app compatibility testing' },
    ],
    audit_logs: [
      { id: 'log_001', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), event: 'Instance Created', severity: 'info', instance_id: 'inst_001', user_id: 'user_123', details: 'QA-Test-Android-14 provisioned successfully', action: 'provision' },
      { id: 'log_002', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), event: 'High CPU Alert', severity: 'warning', instance_id: 'inst_003', user_id: null, details: 'CPU usage exceeded 95% threshold for 5 minutes', action: 'alert' },
      { id: 'log_003', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), event: 'Instance Suspended', severity: 'critical', instance_id: 'inst_003', user_id: 'system', details: 'Instance suspended due to AUP violation: cryptocurrency mining detected', action: 'suspend' },
      { id: 'log_004', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), event: 'Payment Processed', severity: 'info', instance_id: null, user_id: 'user_123', details: 'Subscription payment of $149.00 processed via Dodo Payments', action: 'payment' },
      { id: 'log_005', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), event: 'User Login', severity: 'info', instance_id: null, user_id: 'user_123', details: 'Successful login from 192.168.1.100', action: 'login' },
    ],
    alerts: [
      { id: 'alert_001', timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), type: 'cpu', severity: 'critical', title: 'Sustained High CPU Usage', message: 'Instance inst_003 has maintained >95% CPU usage for 5+ minutes. Possible cryptocurrency mining activity.', instance_id: 'inst_003', acknowledged: 0 },
      { id: 'alert_002', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), type: 'network', severity: 'warning', title: 'Unusual Outbound Traffic', message: 'Instance inst_003 showing 1200 Mbps outbound traffic. Threshold: 500 Mbps.', instance_id: 'inst_003', acknowledged: 0 },
      { id: 'alert_003', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: 'aup', severity: 'critical', title: 'AUP Violation Detected', message: 'Automated detection flagged potential resource abuse on inst_003. Instance suspended pending review.', instance_id: 'inst_003', acknowledged: 1 },
      { id: 'alert_004', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), type: 'security', severity: 'info', title: 'Failed Login Attempts', message: '3 failed login attempts detected for user_123 from IP 203.0.113.45', instance_id: null, acknowledged: 1 },
      { id: 'alert_005', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'billing', severity: 'info', title: 'Payment Successful', message: 'Subscription payment of $149.00 processed for user_123', instance_id: null, acknowledged: 1 },
    ],
    users: [
      { id: 'user_001', email: 'admin@clouddroid.eu', password_hash: hashPassword('admin123'), name: 'Admin User', role: 'admin', created_at: now, reset_token: null, reset_token_expiry: null, must_change_password: false, two_factor_secret: null, two_factor_backup_codes: null, two_factor_enabled: false, dodo_customer_id: null },
    ],
    subscriptions: [
      { id: 'sub_001', user_id: 'user_001', plan: 'Professional', status: 'active', amount: 149, currency: 'USD', current_period_start: now, current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), cancel_at_period_end: false, created_at: now },
    ],
    metrics_history: [
      { id: 'metric_001', instance_id: 'inst_001', cpu: 34, memory: 62, network_in: 120, network_out: 85, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: 'metric_002', instance_id: 'inst_001', cpu: 38, memory: 65, network_in: 130, network_out: 90, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
      { id: 'metric_003', instance_id: 'inst_001', cpu: 30, memory: 60, network_in: 110, network_out: 80, timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { id: 'metric_004', instance_id: 'inst_002', cpu: 12, memory: 45, network_in: 45, network_out: 32, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: 'metric_005', instance_id: 'inst_002', cpu: 15, memory: 48, network_in: 50, network_out: 35, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
      { id: 'metric_006', instance_id: 'inst_003', cpu: 98, memory: 89, network_in: 450, network_out: 1200, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: 'metric_007', instance_id: 'inst_003', cpu: 95, memory: 85, network_in: 400, network_out: 1100, timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    ],
  };

  saveDatabase(db);
}

initDatabase();

export function getUsers() {
  return db.users;
}

export function getUserByEmail(email: string) {
  return db.users.find((u) => u.email === email) || null;
}

export function getUserById(id: string) {
  return db.users.find((u) => u.id === id) || null;
}

export function createUser(data: Omit<User, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  const newUser: User = {
    ...data,
    id: `user_${String(db.users.length + 1).padStart(3, '0')}`,
    created_at: now,
  };
  db.users.push(newUser);
  saveDatabase(db);
  return newUser;
}

export function deleteUser(id: string) {
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  db.users.splice(index, 1);
  saveDatabase(db);
  return true;
}

export function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>) {
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  db.users[index] = {
    ...db.users[index],
    ...updates,
  };
  saveDatabase(db);
  return db.users[index];
}

const PLAN_SPECS: Record<string, { instances: number; ram: number; storage: number; platform: string }> = {
  Developer: { instances: 1, ram: 4, storage: 32, platform: 'Android 14' },
  Professional: { instances: 3, ram: 8, storage: 64, platform: 'Android 14' },
  Team: { instances: 10, ram: 16, storage: 128, platform: 'Android 14' },
};

export function provisionInstancesForUser(userId: string, plan: string): Instance[] {
  const spec = PLAN_SPECS[plan] || PLAN_SPECS['Professional'];
  const now = new Date().toISOString();
  const instances: Instance[] = [];

  for (let i = 0; i < spec.instances; i++) {
    const instance: Instance = {
      id: `inst_${Date.now()}_${i}`,
      name: `${plan}-Instance-${i + 1}`,
      platform: spec.platform,
      ram: spec.ram,
      storage: spec.storage,
      status: 'running',
      cpu: Math.floor(Math.random() * 30) + 5,
      memory: Math.floor(Math.random() * 40) + 20,
      network_in: Math.floor(Math.random() * 100) + 10,
      network_out: Math.floor(Math.random() * 100) + 10,
      created_at: now,
      updated_at: now,
      tags: [plan.toLowerCase(), 'provisioned'],
      notes: `Auto-provisioned for ${plan} plan`,
    };
    instances.push(instance);
    db.instances.push(instance);

    createAuditLog({
      event: 'Instance Provisioned',
      severity: 'info',
      instance_id: instance.id,
      user_id: userId,
      details: `Instance ${instance.name} provisioned for ${plan} plan`,
      action: 'provision',
    });
  }

  saveDatabase(db);
  return instances;
}

export function verifyResetToken(token: string): { user: User | null; valid: boolean } {
  const user = db.users.find((u) => u.reset_token === token);
  if (!user || !user.reset_token_expiry) {
    return { user: null, valid: false };
  }
  if (new Date(user.reset_token_expiry) < new Date()) {
    return { user: null, valid: false };
  }
  return { user, valid: true };
}

export function clearResetToken(userId: string) {
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    user.reset_token = null;
    user.reset_token_expiry = null;
    saveDatabase(db);
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function getSubscriptions() {
  return db.subscriptions;
}

export function getSubscriptionByUserId(userId: string) {
  return db.subscriptions.find((s) => s.user_id === userId) || null;
}

export function createSubscription(data: Omit<Subscription, 'id' | 'created_at'>) {
  const now = new Date().toISOString();
  const newSubscription: Subscription = {
    ...data,
    id: `sub_${String(db.subscriptions.length + 1).padStart(3, '0')}`,
    created_at: now,
  };
  db.subscriptions.push(newSubscription);
  saveDatabase(db);
  return newSubscription;
}

export function updateSubscription(id: string, updates: Partial<Omit<Subscription, 'id' | 'created_at'>>) {
  const index = db.subscriptions.findIndex((s) => s.id === id);
  if (index === -1) return null;
  db.subscriptions[index] = {
    ...db.subscriptions[index],
    ...updates,
  };
  saveDatabase(db);
  return db.subscriptions[index];
}

export function getInvoices(userId?: string) {
  if (userId) {
    return db.invoices.filter((i) => i.user_id === userId);
  }
  return db.invoices;
}

export function getInvoiceById(id: string) {
  return db.invoices.find((i) => i.id === id) || null;
}

export function createInvoice(data: Omit<Invoice, 'id' | 'created_at'>) {
  const invoice: Invoice = {
    ...data,
    id: `inv_${String(db.invoices.length + 1).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  };
  db.invoices.push(invoice);
  saveDatabase(db);
  return invoice;
}

export function getMetricsHistory(instanceId?: string) {
  if (instanceId) {
    return db.metrics_history.filter((m) => m.instance_id === instanceId);
  }
  return db.metrics_history;
}

export function addMetricHistory(data: Omit<MetricHistory, 'id' | 'timestamp'>) {
  const metric: MetricHistory = {
    ...data,
    id: `metric_${String(db.metrics_history.length + 1).padStart(3, '0')}`,
    timestamp: new Date().toISOString(),
  };
  db.metrics_history.push(metric);
  saveDatabase(db);
  return metric;
}

export function getInstances() {
  return db.instances;
}

export function getInstanceById(id: string) {
  return db.instances.find((inst) => inst.id === id) || null;
}

export function createInstance(data: Omit<Instance, 'id' | 'created_at' | 'updated_at'>) {
  const now = new Date().toISOString();
  const newInstance: Instance = {
    ...data,
    id: `inst_${String(db.instances.length + 1).padStart(3, '0')}`,
    created_at: now,
    updated_at: now,
  };
  db.instances.push(newInstance);
  saveDatabase(db);
  return newInstance;
}

export function updateInstance(id: string, updates: Partial<Omit<Instance, 'id' | 'created_at'>>) {
  const index = db.instances.findIndex((inst) => inst.id === id);
  if (index === -1) return null;
  db.instances[index] = {
    ...db.instances[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveDatabase(db);
  return db.instances[index];
}

export function deleteInstance(id: string) {
  const index = db.instances.findIndex((inst) => inst.id === id);
  if (index === -1) return false;
  db.instances.splice(index, 1);
  saveDatabase(db);
  return true;
}

export function getAuditLogs() {
  return db.audit_logs;
}

export function createAuditLog(data: Omit<AuditLog, 'id' | 'timestamp'>) {
  const log: AuditLog = {
    ...data,
    id: `log_${String(db.audit_logs.length + 1).padStart(3, '0')}`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.push(log);
  saveDatabase(db);
  return log;
}

export function getAlerts() {
  return db.alerts;
}

export function acknowledgeAlert(alertId: string) {
  const alert = db.alerts.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = 1;
    saveDatabase(db);
    return true;
  }
  return false;
}

export function saveToDisk() {
  saveDatabase(db);
}

export function createCheckoutSession(data: Omit<CheckoutSession, 'id' | 'created_at'>) {
  const session: CheckoutSession = {
    ...data,
    id: `cs_${String(db.checkout_sessions.length + 1).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  };
  db.checkout_sessions.push(session);
  saveDatabase(db);
  return session;
}

export function getCheckoutSessionBySessionId(sessionId: string) {
  return db.checkout_sessions.find((s) => s.session_id === sessionId) || null;
}

export function updateCheckoutSession(id: string, updates: Partial<Omit<CheckoutSession, 'id' | 'created_at'>>) {
  const index = db.checkout_sessions.findIndex((s) => s.id === id);
  if (index === -1) return null;
  db.checkout_sessions[index] = {
    ...db.checkout_sessions[index],
    ...updates,
  };
  saveDatabase(db);
  return db.checkout_sessions[index];
}

export function getCheckoutSessionByEmail(email: string) {
  return db.checkout_sessions.find((s) => s.email === email) || null;
}

export function getNotificationChannels(userId: string) {
  return db.notification_channels.filter((c) => c.user_id === userId);
}

export function createNotificationChannel(data: Omit<NotificationChannel, 'id' | 'created_at'>) {
  const channel: NotificationChannel = {
    ...data,
    id: `nc_${String(db.notification_channels.length + 1).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  };
  db.notification_channels.push(channel);
  saveDatabase(db);
  return channel;
}

export function updateNotificationChannel(id: string, updates: Partial<Omit<NotificationChannel, 'id' | 'created_at'>>) {
  const index = db.notification_channels.findIndex((c) => c.id === id);
  if (index === -1) return null;
  db.notification_channels[index] = {
    ...db.notification_channels[index],
    ...updates,
  };
  saveDatabase(db);
  return db.notification_channels[index];
}

export function deleteNotificationChannel(id: string) {
  const index = db.notification_channels.findIndex((c) => c.id === id);
  if (index === -1) return false;
  db.notification_channels.splice(index, 1);
  saveDatabase(db);
  return true;
}

export default db;
