import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './db/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import inventoryRoutes from './routes/inventory.js';
import orderRoutes from './routes/orders.js';
import bomTemplateRoutes from './routes/bom-templates.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import templateRoutes from './routes/templates.js';
import usersRoutes from './routes/users.js';
import productionRoutes from './routes/production.js';
import paymentRoutes from './routes/payments.js';
import posRoutes from './routes/pos.js';
import deliveryRoutes from './routes/delivery.js';
import branchRoutes from './routes/branches.js';
import employeePaymentRoutes from './routes/employee-payments.js';
import appointmentRoutes from './routes/appointments.js';
import expenseRoutes from './routes/expenses.js';
import fabricCatalogueRoutes from './routes/fabric-catalogue.js';
import supplierRoutes from './routes/suppliers.js';
import purchaseOrderRoutes from './routes/purchase-orders.js';
import reportRoutes from './routes/reports.js';
import exportRoutes from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & Middleware ──
// Use Helmet for security HTTP headers. Since we serve React, disable CSP
// if it interferes with inline styles or Vite HMR, or configure it explicitly.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Basic Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Limit each IP to 3000 requests per windowMs (high limit for POS usage)
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use(cors({
  origin: '*', // Inside Electron this is local anyway, but for external access lock down if needed
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for bulk image uploads/BOM payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize database
initializeDatabase();

// Schedule reminder cron (POSTs to webhook if configured)
import { scheduleReminderCron } from './cron/reminders.js';
scheduleReminderCron();

// Health check
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/billing', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/bom-templates', bomTemplateRoutes);
app.use('/api/employee-payments', employeePaymentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/fabric-catalogue', fabricCatalogueRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

// Serve static frontend in production
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// When running in Electron, FRONTEND_PATH is set; otherwise use relative path
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../../dist');
app.use(express.static(frontendPath, { maxAge: '1d', etag: true }));

// Handle React routing, return all requests to React app
app.get('*', (req: express.Request, res: express.Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

/** Start the server. Returns the http.Server. Used when running in Electron. */
export function startServer(port = PORT): Promise<import('http').Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(Number(port), '0.0.0.0', () => {
      try {
        import('os').then(os => {
          const nets = os.networkInterfaces();
          const ips: string[] = ['127.0.0.1'];
          for (const iface of Object.values(nets)) {
            for (const addr of iface || []) {
              if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
            }
          }
          console.log(`Superb Pos API running on:`);
          ips.forEach(ip => console.log(`  http://${ip}:${port}`));
        });
      } catch { }
      resolve(server);
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Close other apps using it.`);
      }
      reject(err);
    });
  });
}

// Auto-start when run directly via `node dist/index.js`
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  startServer();
}
