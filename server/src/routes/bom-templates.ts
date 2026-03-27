import { Router } from 'express';
import { db } from '../db/index.js';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin', 'manager'));

// List BOM templates
router.get('/', (req: AuthRequest, res) => {
    const templates = db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM bom_template_items WHERE template_id = t.id) as item_count
    FROM bom_templates t
    WHERE t.is_active = 1
    ORDER BY t.garment_type
  `).all();
    res.json({ templates });
});

// Get template with items
router.get('/:id', (req: AuthRequest, res) => {
    const template = db.prepare('SELECT * FROM bom_templates WHERE id = ?').get(req.params.id);
    if (!template) {
        return res.status(404).json({ error: 'Template not found' });
    }

    const items = db.prepare(`
    SELECT bi.*, i.item_code, i.name as inventory_item_name
    FROM bom_template_items bi
    LEFT JOIN inventory_items i ON bi.item_id = i.id
    WHERE bi.template_id = ?
  `).all(req.params.id);

    res.json({ template, items });
});

// Create template
router.post('/', (req: AuthRequest, res) => {
    const { garment_type, name, description } = req.body;

    if (!garment_type || !name) {
        return res.status(400).json({ error: 'Garment type and name required' });
    }

    // Check if template exists for this garment type
    const existing = db.prepare('SELECT id FROM bom_templates WHERE garment_type = ?').get(garment_type);
    if (existing) {
        return res.status(400).json({ error: 'Template for this garment type already exists' });
    }

    const result = db.prepare(`
    INSERT INTO bom_templates (garment_type, name, description) VALUES (?, ?, ?)
  `).run(garment_type, name, description);

    const template = db.prepare('SELECT * FROM bom_templates WHERE id = ?').get(result.lastInsertRowid);
    res.json({ template });
});

// Update template
router.put('/:id', (req: AuthRequest, res) => {
    const { name, description, is_active } = req.body;

    db.prepare(`
    UPDATE bom_templates SET name = ?, description = ?, is_active = ? WHERE id = ?
  `).run(name, description, is_active ? 1 : 0, req.params.id);

    const template = db.prepare('SELECT * FROM bom_templates WHERE id = ?').get(req.params.id);
    res.json({ template });
});

// Add item to template
router.post('/:id/items', (req: AuthRequest, res) => {
    const { item_id, item_name, default_quantity, unit, notes } = req.body;

    if (!item_name || !default_quantity || !unit) {
        return res.status(400).json({ error: 'Item name, quantity, and unit required' });
    }

    const result = db.prepare(`
    INSERT INTO bom_template_items (template_id, item_id, item_name, default_quantity, unit, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, item_id, item_name, default_quantity, unit, notes);

    const item = db.prepare('SELECT * FROM bom_template_items WHERE id = ?').get(result.lastInsertRowid);
    res.json({ item });
});

// Remove item from template
router.delete('/items/:itemId', (req: AuthRequest, res) => {
    db.prepare('DELETE FROM bom_template_items WHERE id = ?').run(req.params.itemId);
    res.json({ success: true });
});

export default router;
