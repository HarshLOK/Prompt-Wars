require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { getContextUser, JWT_SECRET } = require('./auth');
const { fetchTicketByPhone } = require('./ticketingMock');
const { generateQRToken, validateQRToken } = require('./qrService');
const { getWaitTimes, getDensity } = require('./crowdService');
const { initKafka } = require('./kafkaService');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { loadGCPSecrets } = require('./secrets');

const ordersRouter = require('./routes/orders');
const incidentsRouter = require('./routes/incidents');

const PORT = process.env.PORT || 4000;

// Basic GraphQL schema
const typeDefs = `#graphql
  type Query {
    hello: String
    me: User
  }

  type User {
    id: ID!
    username: String!
    role: String!
  }
`;

// Basic resolvers
const resolvers = {
  Query: {
    hello: () => 'Welcome to CrowdSync API',
    me: (_, __, context) => {
        if (!context.user) throw new Error('Not authenticated');
        return context.user;
    }
  },
};

async function startServer() {
    // 1. Load Secrets from GCP Secret Manager First
    await loadGCPSecrets();

    const app = express();
    const httpServer = http.createServer(app);
    
    // Initialize Socket.io
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Setup Redis Adapter for multi-instance scaling on Cloud Run
    try {
        const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        const subClient = pubClient.duplicate();
        
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[Redis] Attached Redis Adapter to Socket.io');
    } catch (err) {
        console.warn('[Redis] Redis not available, running Socket.io in-memory mode.');
    }

    // Socket.io connection logic
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        
        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    // Start WebSocket State Broadcast Loop (Optimization Phase 2)
    setInterval(() => {
        io.emit('crowd_state_update', {
            density: getDensity(),
            waitTimes: getWaitTimes()
        });
    }, 5000);

    // Make io accessible to the routes (simple attachment to app for MVP)
    app.set('io', io);

    // Rate Limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200, // limit each IP to 200 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use(limiter);

    app.use(cors());
    app.use(express.json());

    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await server.start();

    // Mount Apollo middleware
    app.use('/graphql', expressMiddleware(server, {
        context: async ({ req }) => ({ user: getContextUser(req) }),
    }));

    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', message: 'CrowdSync API is running' });
    });

    app.post('/api/login', (req, res) => {
        const { username, password } = req.body;
        // Mock authentication logic for MVP
        if (username === 'admin' && password === 'password') {
            const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, user: { id: 1, username: 'admin', role: 'admin' } });
        } else if (username === 'staff' && password === 'password') {
            const token = jwt.sign({ id: 2, username: 'staff', role: 'staff' }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, user: { id: 2, username: 'staff', role: 'staff' } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });

    app.get('/api/tickets/mock', async (req, res) => {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        try {
            const ticket = await fetchTicketByPhone(phone);
            res.json(ticket);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    // Generate QR Endpoint (For Attendee App)
    app.get('/api/qr/generate', (req, res) => {
        const { ticketId, phone } = req.query;
        
        if (!ticketId || !phone) {
            return res.status(400).json({ error: 'ticketId and phone are required' });
        }

        const token = generateQRToken(ticketId, phone);
        res.json({ qrToken: token, expiresIn: 60 });
    });

    // Validate QR Endpoint (For Staff Dashboard / Gate Scanners)
    app.post('/api/qr/validate', async (req, res) => {
        const { qrToken } = req.body;
        
        if (!qrToken) {
            return res.status(400).json({ error: 'qrToken is required' });
        }

        const result = await validateQRToken(qrToken);
        
        if (result.valid) {
            res.status(200).json(result);
        } else {
            res.status(403).json(result);
        }
    });

    // Map Data API Endpoint
    app.get('/api/map', async (req, res) => {
        // Return MVP static JSON representation of venue layout
        res.json({
            zones: [
                {
                    id: 'zone-a',
                    name: 'Main Stage',
                    bounds: { x: 10, y: 10, width: 80, height: 40 },
                    pois: [
                        { id: 'poi-1', name: 'Stage Bar', type: 'FOOD', coordX: 20, coordY: 30 },
                        { id: 'poi-2', name: 'Medical Tent A', type: 'FIRST_AID', coordX: 85, coordY: 15 }
                    ]
                },
                {
                    id: 'zone-b',
                    name: 'Food Court',
                    bounds: { x: 10, y: 60, width: 80, height: 30 },
                    pois: [
                        { id: 'poi-3', name: 'Restrooms', type: 'RESTROOM', coordX: 15, coordY: 75 },
                        { id: 'poi-4', name: 'Burger Stand', type: 'FOOD', coordX: 50, coordY: 75 }
                    ]
                }
            ]
        });
    });

    // Crowd Data APIs
    app.get('/api/crowd/wait-times', (req, res) => {
        res.json(getWaitTimes());
    });

    app.get('/api/crowd/density', (req, res) => {
        res.json(getDensity());
    });

    // In-memory array for MVP Notification storage (we bypass Prisma to avoid needing migration steps immediately)
    const notifications = [];

    app.get('/api/notifications', (req, res) => {
        const { audience } = req.query;
        let filtered = notifications;
        if (audience) {
            filtered = notifications.filter(n => n.audience === audience || n.audience === 'ALL');
        }
        // Return latest first
        res.json(filtered.slice().reverse());
    });

    app.post('/api/notifications', (req, res) => {
        const { title, message, audience, priority } = req.body;
        
        const newNotification = {
            id: Date.now().toString(),
            title,
            message,
            audience: audience || 'ALL',
            priority: priority || 'LOW',
            createdAt: new Date().toISOString()
        };
        
        notifications.push(newNotification);

        // Broadcast to appropriate rooms
        const io = req.app.get('io');
        if (newNotification.audience === 'STAFF' || newNotification.audience === 'ALL') {
            io.to('staff-room').emit('new_alert', newNotification);
        }
        if (newNotification.audience === 'ATTENDEE' || newNotification.audience === 'ALL') {
            io.to('attendee-room').emit('new_alert', newNotification);
        }

        res.status(201).json(newNotification);
    });

    // E-Commerce Data (Mocked for MVP)
    const mockVendors = [
        {
            id: 'vendor-1',
            name: 'Stage Bar',
            description: 'Cold drinks near the main stage.',
            poiId: 'poi-1',
            menuItems: [
                { id: 'item-1', name: 'Craft Beer', price: 8.00 },
                { id: 'item-2', name: 'Bottled Water', price: 4.00 }
            ]
        },
        {
            id: 'vendor-2',
            name: 'Burger Stand',
            description: 'Classic burgers and fries.',
            poiId: 'poi-4',
            menuItems: [
                { id: 'item-3', name: 'Cheeseburger', price: 12.00 },
                { id: 'item-4', name: 'Fries', price: 6.00 }
            ]
        }
    ];

    const mockOrders = [];

    app.get('/api/vendors', (req, res) => {
        res.json(mockVendors);
    });

    // Mount Modular Routes
    app.use('/api/orders', ordersRouter);
    app.use('/api/incidents', incidentsRouter);

    // AI Assistant Chat Mock

    app.post('/api/ai/chat', (req, res) => {
        const { message } = req.body;
        const query = message.toLowerCase();
        
        // Context Gathering
        const densities = getDensity();
        const waitTimes = getWaitTimes();
        
        let reply = "I'm the CrowdSync AI. How can I help you manage the venue?";

        if (query.includes('crowd') || query.includes('density') || query.includes('busy')) {
            const mostCrowded = Object.entries(densities).sort((a,b) => b[1] - a[1])[0];
            reply = `Currently, the most crowded zone is ${mostCrowded[0]} at ${mostCrowded[1]}% capacity. Consider dispatching staff to manage the flow.`;
        } else if (query.includes('wait') || query.includes('queue')) {
            const longestWait = Object.entries(waitTimes).sort((a,b) => b[1] - a[1])[0];
            reply = `The longest queue is at ${longestWait[0]} with a ${longestWait[1]} minute wait. You may want to open another turnstile.`;
        } else if (query.includes('incident') || query.includes('task')) {
            let openIncidents = 1; // Fallback mock value
            prisma.incident.count({ where: { status: 'OPEN' } })
                .then(count => { openIncidents = count; })
                .catch(() => {}); // ignore error if DB is offline
            
            setTimeout(() => {
                res.json({ reply: `There are currently open incidents requiring attention. Check the dashboard.` });
            }, 1000);
            return;
        }

        setTimeout(() => {
            res.json({ reply });
        }, 1000); // simulate network/AI delay
    });

    httpServer.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
        
        // Initialize Kafka (or fallback simulator if Kafka is down)
        initKafka();
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
});
