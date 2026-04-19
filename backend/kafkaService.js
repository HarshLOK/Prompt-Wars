const { Kafka } = require('kafkajs');
const { processDensityEvent, processTurnstileEvent } = require('./crowdService');

const kafka = new Kafka({
    clientId: 'crowdsync-backend',
    // Using localhost:29092 which is exposed by docker-compose for external access
    brokers: ['localhost:29092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'crowd-monitoring-group' });

const TOPIC_DENSITY = 'sensor-cctv-density';
const TOPIC_TURNSTILE = 'sensor-turnstile-events';

let isConnected = false;

const initKafka = async () => {
    try {
        await producer.connect();
        await consumer.connect();
        
        await consumer.subscribe({ topic: TOPIC_DENSITY, fromBeginning: false });
        await consumer.subscribe({ topic: TOPIC_TURNSTILE, fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const payload = message.value.toString();
                if (topic === TOPIC_DENSITY) {
                    processDensityEvent(payload);
                } else if (topic === TOPIC_TURNSTILE) {
                    processTurnstileEvent(payload);
                }
            },
        });

        isConnected = true;
        console.log('Kafka Consumer and Producer connected successfully.');
        
        // Start the simulator
        startSimulator();
    } catch (error) {
        console.error('Error connecting to Kafka (Ensure docker-compose is running):', error.message);
        console.log('Running in Mock Mode (No Kafka) for development...');
        // Fallback to internal simulation if Kafka is down
        startSimulator(true);
    }
};

// SIMULATOR: Generates fake data every 5 seconds to simulate an active event
const startSimulator = (mockMode = false) => {
    setInterval(async () => {
        // Randomize density for Zone A (40-90%) and Zone B (10-60%)
        const densityA = Math.floor(Math.random() * 50) + 40;
        const densityB = Math.floor(Math.random() * 50) + 10;
        
        const densityMsgA = JSON.stringify({ zoneId: 'zone-a', density: densityA });
        const densityMsgB = JSON.stringify({ zoneId: 'zone-b', density: densityB });

        // Randomize turnstile throughput
        const turnstileMsg1 = JSON.stringify({ gateId: 'gate-1', entriesPerMinute: Math.floor(Math.random() * 20) });

        if (!mockMode && isConnected) {
            try {
                await producer.send({
                    topic: TOPIC_DENSITY,
                    messages: [{ value: densityMsgA }, { value: densityMsgB }],
                });
                await producer.send({
                    topic: TOPIC_TURNSTILE,
                    messages: [{ value: turnstileMsg1 }],
                });
            } catch (err) {
                console.error('Failed to send Kafka message:', err.message);
            }
        } else {
            // Fallback: Just process it directly into the state
            processDensityEvent(densityMsgA);
            processDensityEvent(densityMsgB);
            processTurnstileEvent(turnstileMsg1);
        }
    }, 5000);
};

module.exports = { initKafka };
