import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get all templates
router.get('/', (req: AuthRequest, res) => {
    const templates = db.prepare('SELECT * FROM garment_templates WHERE is_active = 1 ORDER BY name').all();
    const parsed = templates.map((t: any) => ({
        ...t,
        measurement_fields: typeof t.measurement_fields === 'string' ? JSON.parse(t.measurement_fields) : t.measurement_fields,
        styles: typeof t.styles === 'string' ? JSON.parse(t.styles) : (t.styles || [])
    }));
    res.json({ templates: parsed });
});

// Create template
router.post('/', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    const { code, name, measurement_fields, base_price, styles } = req.body;

    // Auto-generate code if not provided
    const finalCode = code || name.toLowerCase().replace(/\s+/g, '_');

    try {
        const result = db.prepare(`
            INSERT INTO garment_templates (code, name, measurement_fields, base_price, styles)
            VALUES (?, ?, ?, ?, ?)
        `).run(finalCode, name, JSON.stringify(measurement_fields), base_price || 0, JSON.stringify(styles || []));

        const template = db.prepare('SELECT * FROM garment_templates WHERE id = ?').get(result.lastInsertRowid);
        res.json({ template });
    } catch (e: any) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Garment code already exists' });
        }
        throw e;
    }
});

// Update template
router.put('/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    const { name, measurement_fields, base_price, styles } = req.body;

    try {
        db.prepare(`
            UPDATE garment_templates SET name = ?, measurement_fields = ?, base_price = ?, styles = ? WHERE id = ?
        `).run(name, JSON.stringify(measurement_fields), base_price || 0, JSON.stringify(styles || []), req.params.id);

        const template = db.prepare('SELECT * FROM garment_templates WHERE id = ?').get(req.params.id);
        res.json({ template });
    } catch (e: any) {
        console.error("Template update error:", e);
        res.status(500).json({ error: e.message || 'Internal server error' });
    }
});

// Delete template (soft delete)
router.delete('/:id', roleMiddleware('admin', 'manager'), (req: AuthRequest, res) => {
    db.prepare('UPDATE garment_templates SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

export default router;
