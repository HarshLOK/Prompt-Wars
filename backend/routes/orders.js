const express = require('express');
const router = express.Router();
const { authenticate } = require('../auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// MVP Mock Data Fallback
const mockOrders = [];
let mockId = 1;

// GET /api/orders (Staff Queue)
router.get('/', authenticate, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (err) {
        console.warn('Prisma not available. Using mock orders.');
        res.json(mockOrders.slice().reverse());
    }
});

// POST /api/orders (Mobile Submission)
// Intentionally not authenticated here for MVP so attendees without accounts can order via QR session
router.post('/', async (req, res) => {
    const { vendorId, phone, items, totalAmount } = req.body;
    
    if (!vendorId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order payload' });
    }

    try {
        // Attempt Prisma Create
        const newOrder = await prisma.order.create({
            data: {
                userId: phone || 'anonymous',
                vendorId,
                totalAmount,
                status: 'PENDING',
                items: {
                    create: items.map(i => ({
                        menuItemId: i.id,
                        quantity: i.quantity
                    }))
                }
            },
            include: { items: true }
        });
        res.status(201).json({ message: 'Order placed successfully!', order: newOrder });
    } catch (err) {
        console.warn('Prisma not available. Using mock fallback.');
        const newOrder = {
            id: `ORD-${mockId++}`,
            vendorId,
            phone,
            items,
            totalAmount,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        mockOrders.push(newOrder);
        res.status(201).json({ message: 'Order placed successfully!', order: newOrder });
    }
});

module.exports = router;
