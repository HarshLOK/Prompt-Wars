// Mock Ticketing API Service
// Simulates an external ticketing system (like Ticketmaster or Eventbrite)

const MOCK_TICKETS = [
    {
        ticketId: 'TKT-1001',
        attendeeName: 'John Doe',
        phone: '+1 234 567 8900', // Matches the mock phone in mobile app
        ticketType: 'VIP',
        zoneAccess: ['Zone A', 'Zone B', 'VIP Lounge'],
        isValid: true
    },
    {
        ticketId: 'TKT-1002',
        attendeeName: 'Jane Smith',
        phone: '+1 987 654 3210',
        ticketType: 'General Admission',
        zoneAccess: ['Zone A', 'Zone B'],
        isValid: true
    },
    {
        ticketId: 'TKT-1003',
        attendeeName: 'Fake User',
        phone: '+1 000 000 0000',
        ticketType: 'General Admission',
        zoneAccess: ['Zone A'],
        isValid: false // Invalid or revoked ticket
    }
];

/**
 * Simulates fetching ticket details by phone number (used for mobile login)
 */
const fetchTicketByPhone = async (phone) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const ticket = MOCK_TICKETS.find(t => t.phone === phone);
    if (!ticket) {
        throw new Error('Ticket not found for this phone number.');
    }
    return ticket;
};

/**
 * Simulates fetching ticket details by Ticket ID
 */
const fetchTicketById = async (ticketId) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const ticket = MOCK_TICKETS.find(t => t.ticketId === ticketId);
    if (!ticket) {
        throw new Error('Ticket not found.');
    }
    return ticket;
};

module.exports = {
    fetchTicketByPhone,
    fetchTicketById,
    MOCK_TICKETS
};
