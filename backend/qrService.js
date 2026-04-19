const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');
const { fetchTicketById } = require('./ticketingMock');

const QR_EXPIRY_SECONDS = 60; // 1 minute window

// In-Memory cache to prevent Replay Attacks within the 60s window
// For production, this should be migrated to Redis
const scannedTokens = new Set();

const generateQRToken = (ticketId, phone) => {
    // Generates a short-lived token specifically for QR representation
    const payload = {
        ticketId,
        phone,
        purpose: 'gate_entry'
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: `${QR_EXPIRY_SECONDS}s` });
    return token;
};

const validateQRToken = async (qrToken) => {
    try {
        // 1. Verify cryptographic signature and expiration
        const decoded = jwt.verify(qrToken, JWT_SECRET);
        
        if (decoded.purpose !== 'gate_entry') {
            return { valid: false, error: 'Invalid token purpose' };
        }

        // REPLAY PROTECTION: Ensure token hasn't been used
        if (scannedTokens.has(qrToken)) {
            return { valid: false, error: 'Duplicate scan. Ticket already admitted!' };
        }

        // 2. Fetch latest ticket details from the Mock Ticketing API
        const ticket = await fetchTicketById(decoded.ticketId);
        
        // 3. Check if ticket is revoked/invalid at the source
        if (!ticket.isValid) {
            return { valid: false, error: 'Ticket has been revoked or is invalid.' };
        }

        // Mark as scanned to prevent replay attacks
        scannedTokens.add(qrToken);
        setTimeout(() => scannedTokens.delete(qrToken), QR_EXPIRY_SECONDS * 1000);

        return { valid: true, ticket };
    } catch (error) {
        // Distinguish between expired and tampered tokens
        if (error.name === 'TokenExpiredError') {
            return { valid: false, error: 'QR Code expired. Please refresh the attendee app.' };
        }
        return { valid: false, error: 'Invalid or corrupted QR code.' };
    }
};

module.exports = {
    generateQRToken,
    validateQRToken
};
