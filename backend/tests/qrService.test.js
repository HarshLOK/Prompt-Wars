const { generateQRToken, validateQRToken } = require('../qrService');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../auth');

// Mock fetchTicketById to prevent actual DB/API calls
jest.mock('../ticketingMock', () => ({
    fetchTicketById: jest.fn().mockResolvedValue({ id: 'TKT-1001', isValid: true })
}));

describe('QR Service', () => {
    let token;

    beforeEach(() => {
        token = generateQRToken('TKT-1001', '+15550000000');
    });

    test('should generate a valid JWT token', () => {
        expect(token).toBeDefined();
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.ticketId).toBe('TKT-1001');
        expect(decoded.purpose).toBe('gate_entry');
    });

    test('should validate a fresh token successfully', async () => {
        const result = await validateQRToken(token);
        expect(result.valid).toBe(true);
        expect(result.ticket.id).toBe('TKT-1001');
    });

    test('should reject a duplicate token scan (Replay Protection)', async () => {
        // First scan
        await validateQRToken(token);
        // Second scan of the same token
        const result = await validateQRToken(token);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Duplicate scan');
    });

    test('should reject invalid purpose', async () => {
        const badToken = jwt.sign({ ticketId: 'TKT-1001', purpose: 'some_other_purpose' }, JWT_SECRET);
        const result = await validateQRToken(badToken);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid token purpose');
    });
});
