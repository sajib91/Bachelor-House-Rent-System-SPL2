const resolveSslBaseUrl = () => {
    const mode = String(process.env.SSL_PAYMENT_MODE || 'sandbox').toLowerCase();
    return mode === 'live'
        ? 'https://securepay.sslcommerz.com'
        : 'https://sandbox.sslcommerz.com';
};

const hasSslCredentials = () => Boolean(process.env.SSL_STORE_ID && process.env.SSL_STORE_PASSWORD);

const toFormBody = (payload = {}) => {
    const formData = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    });
    return formData.toString();
};

const initializeSslSession = async (payload = {}) => {
    const url = `${resolveSslBaseUrl()}/gwprocess/v4/api.php`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: toFormBody(payload),
    });

    if (!response.ok) {
        throw new Error(`SSLCommerz init failed with status ${response.status}`);
    }

    return response.json();
};

const validateSslPayment = async ({ validationId, transactionId } = {}) => {
    const base = resolveSslBaseUrl();
    const query = new URLSearchParams({
        val_id: validationId,
        store_id: String(process.env.SSL_STORE_ID || ''),
        store_passwd: String(process.env.SSL_STORE_PASSWORD || ''),
        format: 'json',
    });

    if (transactionId) {
        query.append('tran_id', transactionId);
    }

    const response = await fetch(`${base}/validator/api/validationserverAPI.php?${query.toString()}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(`SSLCommerz validation failed with status ${response.status}`);
    }

    return response.json();
};

const normalizeGatewayStatus = (status = '') => String(status).trim().toUpperCase();

const isSslValidationSuccessful = (validation = {}) => {
    const status = normalizeGatewayStatus(validation.status || validation.APIConnect || '');
    return status === 'VALID' || status === 'VALIDATED';
};

module.exports = {
    hasSslCredentials,
    initializeSslSession,
    validateSslPayment,
    isSslValidationSuccessful,
};
