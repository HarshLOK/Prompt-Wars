const { authenticate, requireRole, getContextUser, JWT_SECRET } = require('../auth');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
    test('authenticate should allow valid tokens', () => {
        const token = jwt.sign({ id: 1, role: 'staff' }, JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = {};
        const next = jest.fn();

        authenticate(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user.role).toBe('staff');
    });

    test('authenticate should block missing headers', () => {
        const req = { headers: {} };
        const res = { sendStatus: jest.fn() };
        const next = jest.fn();

        authenticate(req, res, next);
        expect(res.sendStatus).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('requireRole should block unauthorized roles', () => {
        const req = { user: { role: 'attendee' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        const middleware = requireRole('staff');
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
