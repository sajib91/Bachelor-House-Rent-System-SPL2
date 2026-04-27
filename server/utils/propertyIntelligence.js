const spamKeywords = [
    'http://',
    'https://',
    'bit.ly',
    'free money',
    'send otp',
    'urgent transfer',
    'click here',
    'casino',
    'loan guaranteed',
];

const riskyTransactionPatterns = [/^[A-Z]{2,5}-?\d{2,}$/i, /^\d{6,}$/, /^[A-Za-z0-9]{8,}$/];

const getEnvNumber = (key, fallback) => {
    const value = Number(process.env[key]);
    return Number.isFinite(value) ? value : fallback;
};

const getDefaultThresholds = () => ({
    fraud: {
        medium: getEnvNumber('INTEL_FRAUD_MEDIUM_THRESHOLD', 40),
        high: getEnvNumber('INTEL_FRAUD_HIGH_THRESHOLD', 70),
    },
    risk: {
        medium: getEnvNumber('INTEL_RISK_MEDIUM_THRESHOLD', 40),
        high: getEnvNumber('INTEL_RISK_HIGH_THRESHOLD', 70),
    },
    pricing: {
        lowOccupancy: getEnvNumber('INTEL_PRICING_LOW_OCCUPANCY', 0.35),
        highOccupancy: getEnvNumber('INTEL_PRICING_HIGH_OCCUPANCY', 0.8),
        strongQuality: getEnvNumber('INTEL_PRICING_STRONG_QUALITY', 80),
        weakQuality: getEnvNumber('INTEL_PRICING_WEAK_QUALITY', 45),
        strongCommute: getEnvNumber('INTEL_PRICING_STRONG_COMMUTE', 80),
        weakCommute: getEnvNumber('INTEL_PRICING_WEAK_COMMUTE', 35),
    },
    quality: {
        gradeA: getEnvNumber('INTEL_QUALITY_GRADE_A', 85),
        gradeB: getEnvNumber('INTEL_QUALITY_GRADE_B', 70),
        gradeC: getEnvNumber('INTEL_QUALITY_GRADE_C', 55),
    },
});

const resolveThresholds = (overrides = null) => {
    const defaults = getDefaultThresholds();
    if (!overrides) return defaults;

    return {
        fraud: {
            ...defaults.fraud,
            ...(overrides.fraud || {}),
        },
        risk: {
            ...defaults.risk,
            ...(overrides.risk || {}),
        },
        pricing: {
            ...defaults.pricing,
            ...(overrides.pricing || {}),
        },
        quality: {
            ...defaults.quality,
            ...(overrides.quality || {}),
        },
    };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeText = (value) => String(value || '').trim();

const analyzeTextForFraud = (text = '', overrides = null) => {
    const thresholds = resolveThresholds(overrides);
    const value = normalizeText(text);
    const lowered = value.toLowerCase();

    const flags = [];
    let score = 0;

    if (!value) {
        return { score: 0, riskLevel: 'Low', flags };
    }

    const keywordHits = spamKeywords.filter((keyword) => lowered.includes(keyword));
    if (keywordHits.length > 0) {
        score += keywordHits.length * 20;
        flags.push('Contains suspicious keyword or URL');
    }

    const repeatedCharMatch = value.match(/(.)\1{7,}/);
    if (repeatedCharMatch) {
        score += 20;
        flags.push('Contains repeated characters');
    }

    if ((value.match(/!/g) || []).length >= 4) {
        score += 12;
        flags.push('Excessive punctuation');
    }

    if ((value.match(/\b\d{9,}\b/g) || []).length > 0) {
        score += 15;
        flags.push('Contains long numeric sequence');
    }

    if (value.length < 3) {
        score += 8;
        flags.push('Very short message');
    }

    const normalizedScore = clamp(score, 0, 100);
    const riskLevel = normalizedScore >= thresholds.fraud.high
        ? 'High'
        : normalizedScore >= thresholds.fraud.medium
            ? 'Medium'
            : 'Low';

    return { score: normalizedScore, riskLevel, flags };
};

const scoreListingQuality = (property = {}, overrides = null) => {
    const thresholds = resolveThresholds(overrides);
    const checks = [
        { key: 'title', weight: 10, pass: normalizeText(property.title).length >= 8, message: 'Use a more descriptive title (at least 8 chars).' },
        { key: 'description', weight: 20, pass: normalizeText(property.description).length >= 60, message: 'Add a richer description (60+ chars).' },
        { key: 'photos', weight: 18, pass: (property.photos || []).length >= 3, message: 'Add at least 3 quality photos.' },
        { key: 'address', weight: 10, pass: normalizeText(property.address).length >= 10, message: 'Provide a clearer full address.' },
        { key: 'rules', weight: 8, pass: Boolean(property.rules?.gateClosingTime || property.rules?.guestPolicy), message: 'Add clear house rules.' },
        { key: 'commute', weight: 8, pass: Number(property.commuteMinutes || 0) > 0, message: 'Add commute time for better trust.' },
        { key: 'map', weight: 8, pass: Boolean(property.mapLocation?.link || (property.mapLocation?.latitude !== undefined && property.mapLocation?.longitude !== undefined)), message: 'Attach map link or coordinates.' },
        { key: 'contacts', weight: 8, pass: Boolean(property.landlordWhatsapp || property.landlordPhone), message: 'Add active landlord contact number.' },
        { key: 'paymentNumbers', weight: 10, pass: Boolean(property.landlordBkash || property.landlordNagad), message: 'Add at least one payment number (bKash/Nagad).' },
    ];

    const earned = checks.reduce((sum, check) => sum + (check.pass ? check.weight : 0), 0);
    const score = clamp(Math.round((earned / 100) * 100), 0, 100);

    return {
        score,
        grade: score >= thresholds.quality.gradeA
            ? 'A'
            : score >= thresholds.quality.gradeB
                ? 'B'
                : score >= thresholds.quality.gradeC
                    ? 'C'
                    : 'D',
        improvements: checks.filter((check) => !check.pass).map((check) => check.message),
        passedChecks: checks.filter((check) => check.pass).map((check) => check.key),
    };
};

const computeCommuteScore = (property = {}) => {
    const minutes = Number(property.commuteMinutes || 0);
    if (!minutes) {
        return { score: 50, label: 'Unknown', recommendation: 'Add commute minutes for better ranking.' };
    }

    const score = clamp(Math.round(100 - minutes * 2), 10, 100);
    const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Long';
    const recommendation = score >= 60
        ? 'Commute is attractive for students.'
        : 'Consider highlighting transport options to improve tenant confidence.';

    return { score, label, recommendation, minutes };
};

const recommendDynamicPrice = (property = {}, marketStats = {}, overrides = null) => {
    const thresholds = resolveThresholds(overrides);
    const currentRent = Number(property.monthlyRentPerSeat || 0);
    const marketMedian = Number(marketStats.marketMedian || currentRent || 0);
    const occupancyRatio = Number(marketStats.occupancyRatio || 0.5);
    const qualityScore = Number(marketStats.qualityScore || 60);
    const commuteScore = Number(marketStats.commuteScore || 50);

    const occupancyAdjustment = occupancyRatio < thresholds.pricing.lowOccupancy ? -0.08 : occupancyRatio > thresholds.pricing.highOccupancy ? 0.08 : 0;
    const qualityAdjustment = qualityScore >= thresholds.pricing.strongQuality ? 0.07 : qualityScore <= thresholds.pricing.weakQuality ? -0.07 : 0;
    const commuteAdjustment = commuteScore >= thresholds.pricing.strongCommute ? 0.05 : commuteScore <= thresholds.pricing.weakCommute ? -0.05 : 0;

    const recommendationFactor = 1 + occupancyAdjustment + qualityAdjustment + commuteAdjustment;
    const recommendedRent = Math.max(0, Math.round((marketMedian || currentRent) * recommendationFactor));
    const delta = recommendedRent - currentRent;

    return {
        currentRent,
        recommendedRent,
        delta,
        confidence: Math.round(clamp(55 + (qualityScore / 4) + (occupancyRatio * 20), 50, 95)),
        reason: delta > 0
            ? 'Demand and quality indicate room for a rent increase.'
            : delta < 0
                ? 'Lowering rent can improve occupancy and reduce vacancies.'
                : 'Current rent is aligned with market and quality signals.',
    };
};

const computeRentalRisk = (entry = {}, overrides = null) => {
    const thresholds = resolveThresholds(overrides);
    const unpaidCount = Number(entry.unpaidCount || 0);
    const rejectedCount = Number(entry.rejectedCount || 0);
    const pendingCount = Number(entry.pendingCount || 0);
    const occupancyRatio = Number(entry.occupancyRatio || 0);

    let risk = 0;
    risk += unpaidCount * 18;
    risk += rejectedCount * 12;
    risk += pendingCount * 6;
    risk += occupancyRatio < 0.4 ? 18 : occupancyRatio < 0.7 ? 8 : 0;

    const score = clamp(risk, 0, 100);
    return {
        score,
        level: score >= thresholds.risk.high
            ? 'High'
            : score >= thresholds.risk.medium
                ? 'Medium'
                : 'Low',
        tips: [
            unpaidCount > 0 ? 'Follow up with unpaid tenants quickly.' : null,
            rejectedCount > 0 ? 'Review payment proof quality and chat history.' : null,
            occupancyRatio < 0.5 ? 'Consider improving listing quality or adjusting pricing.' : null,
        ].filter(Boolean),
    };
};

const getTenantReminderSummary = (records = []) => {
    const overdue = records.filter((row) => !['Paid', 'Complete'].includes(String(row.status || '')));
    const totalDue = overdue.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return {
        dueCount: overdue.length,
        totalDue,
        reminders: overdue.slice(0, 5).map((row) => ({
            propertyId: row.propertyId,
            title: row.title,
            month: row.month,
            amount: row.amount,
            status: row.status,
            message: `Rent due for ${row.title} (${row.month})`,
        })),
    };
};

const assessDocumentVerification = ({ url = '', verificationType = '', role = 'Tenant' } = {}) => {
    const value = normalizeText(url);
    const flags = [];
    let score = 40;

    if (!value) {
        return {
            score: 10,
            confidence: 'Low',
            status: 'Needs Review',
            flags: ['No document uploaded'],
        };
    }

    if (value.startsWith('https://')) score += 25;
    if (value.includes('cloudinary') || value.includes('/uploads/')) score += 20;
    if (/(pdf|jpg|jpeg|png|webp)$/i.test(value)) score += 15;

    if (role === 'Landlord' && verificationType !== 'NID') {
        score -= 25;
        flags.push('Landlord should provide NID verification');
    }

    if (!/(nid|student|passport|id|document)/i.test(value)) {
        flags.push('Document filename is not descriptive');
        score -= 8;
    }

    const bounded = clamp(score, 0, 100);
    return {
        score: bounded,
        confidence: bounded >= 75 ? 'High' : bounded >= 45 ? 'Medium' : 'Low',
        status: bounded >= 70 ? 'Likely Valid' : bounded >= 40 ? 'Needs Review' : 'High Risk',
        flags,
    };
};

const buildPaymentAssistant = ({ provider, transactionId, amount, monthlyRentPerSeat, seatsBooked }) => {
    const txValue = normalizeText(transactionId);
    const flags = [];

    if (!txValue) {
        flags.push('Transaction ID is required.');
    } else if (!riskyTransactionPatterns.some((pattern) => pattern.test(txValue))) {
        flags.push('Transaction ID format looks unusual.');
    }

    const expected = Number(monthlyRentPerSeat || 0) * Number(seatsBooked || 1);
    const paid = Number(amount || 0);

    if (expected > 0 && paid < expected) {
        flags.push(`Amount is below expected rent (expected ${expected}).`);
    }

    if (!provider) {
        flags.push('Choose a payment provider.');
    }

    return {
        status: flags.length === 0 ? 'Looks Good' : 'Needs Attention',
        flags,
        expectedAmount: expected,
        paidAmount: paid,
    };
};

const buildAdminInsights = ({ users = [], properties = [] } = {}) => {
    const totalUsers = users.length;
    const totalProperties = properties.length;
    const pendingUsers = users.filter((user) => user.verificationStatus === 'Pending').length;
    const pendingPublications = properties.filter((property) => property.publicationStatus === 'Pending').length;

    const suspiciousMessages = properties.reduce((sum, property) => (
        sum + (property.messages || []).filter((message) => Number(message.moderation?.score || 0) >= 70).length
    ), 0);

    const suspiciousReviews = properties.reduce((sum, property) => (
        sum + (property.reviews || []).filter((review) => Number(review.moderation?.score || 0) >= 70).length
    ), 0);

    const occupancyValues = properties
        .map((property) => {
            const totalSeats = Number(property.totalSeats || 0);
            const available = Number(property.availableSeats || 0);
            if (!totalSeats) return null;
            return (totalSeats - available) / totalSeats;
        })
        .filter((value) => value !== null);

    const occupancyRate = occupancyValues.length
        ? Math.round((occupancyValues.reduce((sum, value) => sum + value, 0) / occupancyValues.length) * 100)
        : 0;

    const alerts = [];
    if (pendingUsers > 5) alerts.push('High pending user verification queue.');
    if (pendingPublications > 5) alerts.push('High pending publication queue.');
    if (suspiciousMessages + suspiciousReviews > 0) alerts.push('Potential spam/fraud content detected.');

    return {
        totalUsers,
        totalProperties,
        pendingUsers,
        pendingPublications,
        suspiciousMessages,
        suspiciousReviews,
        occupancyRate,
        alerts,
    };
};

module.exports = {
    analyzeTextForFraud,
    scoreListingQuality,
    computeCommuteScore,
    recommendDynamicPrice,
    computeRentalRisk,
    getTenantReminderSummary,
    assessDocumentVerification,
    buildPaymentAssistant,
    buildAdminInsights,
    getDefaultThresholds,
    resolveThresholds,
};
