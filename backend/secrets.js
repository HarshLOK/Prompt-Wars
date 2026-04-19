const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Instantiate the client. (Assumes GOOGLE_APPLICATION_CREDENTIALS are set in environment)
const client = new SecretManagerServiceClient();

async function accessSecretVersion(secretName) {
    // Return environment variable locally if we're not running in GCP
    if (process.env.NODE_ENV !== 'production') {
        return process.env[secretName];
    }

    try {
        const projectId = process.env.GCP_PROJECT_ID || 'my-project-id';
        const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

        // Access the secret.
        const [version] = await client.accessSecretVersion({ name });

        // Extract the payload as a string.
        const payload = version.payload.data.toString('utf8');
        return payload;
    } catch (err) {
        console.warn(`Failed to fetch secret ${secretName} from GCP. Falling back to env vars.`);
        return process.env[secretName];
    }
}

// Ensure critical secrets are loaded before application start
async function loadGCPSecrets() {
    process.env.JWT_SECRET = await accessSecretVersion('JWT_SECRET') || process.env.JWT_SECRET || 'fallback_super_secret_key';
    process.env.DATABASE_URL = await accessSecretVersion('DATABASE_URL') || process.env.DATABASE_URL;
    process.env.REDIS_URL = await accessSecretVersion('REDIS_URL') || process.env.REDIS_URL;
    
    console.log('[Secrets] Loaded Production Secrets from GCP Secret Manager');
}

module.exports = { loadGCPSecrets };
