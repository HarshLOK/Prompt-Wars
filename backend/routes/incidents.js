const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../auth');
const { getPrisma } = require('../db');

const mockIncidents = [
    { id: 'inc-1', title: 'Spill at Food Court', description: 'Large drink spilled near Burger Stand.', status: 'OPEN', assignedTo: null, createdAt: new Date().toISOString() }
];

// GET /api/incidents
router.get('/', authenticate, async (req, res) => {
    const prisma = getPrisma();
    try {
        const incidents = await prisma.incident.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(incidents);
    } catch (err) {
        console.warn('Prisma not available. Using mock incidents.');
        res.json(mockIncidents);
    }
});

// POST /api/incidents
router.post('/', authenticate, async (req, res) => {
    const { title, description } = req.body;
    const prisma = getPrisma();
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    try {
        const newInc = await prisma.incident.create({
            data: { title, description, status: 'OPEN' }
        });
        res.status(201).json(newInc);
    } catch (err) {
        console.warn('Prisma not available. Using mock fallback.');
        const newInc = { id: 'inc-' + Date.now(), title, description, status: 'OPEN', assignedTo: null, createdAt: new Date().toISOString() };
        mockIncidents.push(newInc);
        res.status(201).json(newInc);
    }
});

// PATCH /api/incidents/:id
router.patch('/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    const prisma = getPrisma();

    try {
        const updated = await prisma.incident.update({
            where: { id },
            data: { status, assignedTo }
        });
        res.json(updated);
    } catch (err) {
        console.warn('Prisma not available. Using mock fallback.');
        const inc = mockIncidents.find(i => i.id === id);
        if (!inc) return res.status(404).json({ error: 'Not found' });
        if (status !== undefined) inc.status = status;
        if (assignedTo !== undefined) inc.assignedTo = assignedTo;
        res.json(inc);
    }
});

module.exports = router;
