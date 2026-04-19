// Stores the current state of the venue locally in memory for MVP
const venueState = {
    gateWaitTimes: {
        'gate-1': 5, // mins
        'gate-2': 10
    },
    zoneDensity: {
        'zone-a': 40, // percentage
        'zone-b': 20
    }
};

/**
 * Updates the density based on a simulated CCTV event.
 * Payload example: { zoneId: 'zone-a', density: 65 }
 */
const processDensityEvent = (payload) => {
    try {
        const { zoneId, density } = JSON.parse(payload);
        if (zoneId && density !== undefined) {
            venueState.zoneDensity[zoneId] = density;
            
            // Recalculate wait times for gates associated with this zone (mock logic)
            // e.g. if Zone A is 80% full, the wait time at Gate 1 (entering Zone A) goes up
            if (zoneId === 'zone-a') {
                venueState.gateWaitTimes['gate-1'] = Math.floor(density / 5); 
            } else if (zoneId === 'zone-b') {
                venueState.gateWaitTimes['gate-2'] = Math.floor(density / 6);
            }
        }
    } catch (e) {
        console.error('Error processing density event', e);
    }
};

/**
 * Updates wait time based on turnstile throughput events.
 * Payload example: { gateId: 'gate-1', entriesPerMinute: 15 }
 */
const processTurnstileEvent = (payload) => {
    try {
        const { gateId, entriesPerMinute } = JSON.parse(payload);
        if (gateId && entriesPerMinute !== undefined) {
            // Wait time loosely modeled on queueing theory: High arrivals = high wait
            venueState.gateWaitTimes[gateId] = Math.floor(entriesPerMinute * 0.8);
        }
    } catch (e) {
        console.error('Error processing turnstile event', e);
    }
};

const getWaitTimes = () => {
    return venueState.gateWaitTimes;
};

const getDensity = () => {
    return venueState.zoneDensity;
};

module.exports = {
    processDensityEvent,
    processTurnstileEvent,
    getWaitTimes,
    getDensity
};
