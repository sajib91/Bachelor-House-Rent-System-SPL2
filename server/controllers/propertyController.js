// backend/controllers/propertyController.js

const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const {
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
} = require('../utils/propertyIntelligence');
const {
    hasSslCredentials,
    initializeSslSession,
    validateSslPayment,
    isSslValidationSuccessful,
} = require('../utils/sslCommerzService');
const { hasPostgresDatabase } = require('../utils/dbAdapter');
const getDbClient = require('../config/dbClient');

let io = null;

const setSocketServer = (socketServer) => {
    io = socketServer;
};

const postgresModeEnabled = () => hasPostgresDatabase();

const fromDbEnum = (value) => String(value || '').replace(/_/g, ' ');
const toDbEnum = (value, fallback = '') => String(value || fallback || '').replace(/\s+/g, '_');

const parseJsonArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const parseVerificationFlags = (value) => {
    const flags = parseJsonArray(value);
    return flags.filter((item) => typeof item === 'string' && item.trim());
};

const mapDbLandlord = (landlord) => {
    if (!landlord) return null;
    return {
        _id: landlord.id,
        id: landlord.id,
        fullName: landlord.fullName,
        username: landlord.username,
        email: landlord.email,
        phoneNumber: landlord.phoneNumber,
        role: fromDbEnum(landlord.role),
    };
};

const mapDbProperty = (property) => {
    if (!property) return null;

    return {
        _id: property.id,
        id: property.id,
        landlord: property.landlord ? mapDbLandlord(property.landlord) : property.landlordId,
        landlordName: property.landlordName,
        landlordPhone: property.landlordPhone,
        landlordWhatsapp: property.landlordWhatsapp,
        landlordBkash: property.landlordBkash,
        landlordNagad: property.landlordNagad,
        title: property.title,
        area: property.area,
        nearbyUniversity: property.nearbyUniversity,
        address: property.address,
        mapLocation: {
            latitude: property.mapLatitude,
            longitude: property.mapLongitude,
            label: property.mapLabel,
            link: property.mapLink,
        },
        totalSeats: Number(property.totalSeats || 0),
        availableSeats: Number(property.availableSeats || 0),
        genderPreference: fromDbEnum(property.genderPreference),
        roomType: fromDbEnum(property.roomType),
        monthlyRentPerSeat: Number(property.monthlyRentPerSeat || 0),
        securityDeposit: Number(property.securityDeposit || 0),
        mealSystem: fromDbEnum(property.mealSystem),
        amenities: parseJsonArray(property.amenities),
        rules: {
            gateClosingTime: property.gateClosingTime,
            guestPolicy: property.guestPolicy,
            smokingRules: property.smokingRules,
            attachedBath: Boolean(property.attachedBath),
            filteredWater: Boolean(property.filteredWater),
            lift: Boolean(property.lift),
            wifi: Boolean(property.wifi),
        },
        photos: parseJsonArray(property.photos),
        description: property.description,
        universityProximity: property.universityProximity,
        commuteMinutes: property.commuteMinutes,
        rentalMonth: property.rentalMonth,
        isActive: Boolean(property.isActive),
        publicationStatus: fromDbEnum(property.publicationStatus),
        views: Number(property.views || 0),
        seatApplications: (property.seatApplications || []).map((application) => ({
            _id: application.id,
            tenant: application.tenant ? {
                _id: application.tenant.id,
                id: application.tenant.id,
                fullName: application.tenant.fullName,
                username: application.tenant.username,
                email: application.tenant.email,
                phoneNumber: application.tenant.phoneNumber,
            } : application.tenantId,
            tenantName: application.tenantName,
            tenantEmail: application.tenantEmail,
            tenantPhone: application.tenantPhone,
            studentIdType: fromDbEnum(application.studentIdType),
            seatsRequested: Number(application.seatsRequested || 1),
            documentUrl: application.documentUrl,
            roommateRequest: Boolean(application.roommateRequest),
            note: application.note || '',
            status: fromDbEnum(application.status),
            documentVerification: {
                score: application.verificationScore,
                confidence: application.verificationConfidence,
                status: application.verificationStatus,
                flags: parseVerificationFlags(application.verificationFlags),
            },
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
        })),
        rentPayments: (property.rentPayments || []).map((payment) => ({
            _id: payment.id,
            tenant: payment.tenant ? {
                _id: payment.tenant.id,
                id: payment.tenant.id,
                fullName: payment.tenant.fullName,
                username: payment.tenant.username,
                email: payment.tenant.email,
                phoneNumber: payment.tenant.phoneNumber,
            } : payment.tenantId,
            month: payment.month,
            amount: Number(payment.amount || 0),
            provider: payment.provider,
            transactionId: payment.transactionId,
            status: fromDbEnum(payment.status),
            paidAt: payment.paidAt,
            source: fromDbEnum(payment.source),
            ssl: {
                sessionKey: payment.sslSessionKey,
                preferredMethod: payment.sslPreferredMethod,
                validationId: payment.sslValidationId,
                bankTransactionId: payment.sslBankTransactionId,
                cardType: payment.sslCardType,
                cardIssuer: payment.sslCardIssuer,
                cardBrand: payment.sslCardBrand,
                cardSubtype: payment.sslCardSubtype,
                validatedAmount: payment.sslValidatedAmount != null ? Number(payment.sslValidatedAmount) : undefined,
                currency: payment.sslCurrency,
                gatewayStatus: payment.sslGatewayStatus,
            },
            slip: {
                slipId: payment.slipId,
                generatedAt: payment.slipGeneratedAt,
                downloadUrl: payment.slipDownloadUrl,
                note: payment.slipNote,
            },
            assistant: {
                status: payment.assistantStatus,
                flags: parseVerificationFlags(payment.assistantFlags),
                expectedAmount: payment.assistantExpectedAmount != null ? Number(payment.assistantExpectedAmount) : undefined,
                paidAmount: payment.assistantPaidAmount != null ? Number(payment.assistantPaidAmount) : undefined,
            },
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
        })),
        messages: (property.messages || []).map((message) => ({
            _id: message.id,
            sender: message.sender ? {
                _id: message.sender.id,
                id: message.sender.id,
                fullName: message.sender.fullName,
                username: message.sender.username,
                email: message.sender.email,
                phoneNumber: message.sender.phoneNumber,
            } : message.senderId,
            senderName: message.senderName,
            senderRole: message.senderRole,
            message: message.message,
            moderation: {
                score: message.moderationScore,
                riskLevel: message.moderationRiskLevel,
                flags: parseVerificationFlags(message.moderationFlags),
            },
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
        })),
        reviews: (property.reviews || []).map((review) => ({
            _id: review.id,
            tenant: review.tenant ? {
                _id: review.tenant.id,
                id: review.tenant.id,
                fullName: review.tenant.fullName,
                username: review.tenant.username,
                email: review.tenant.email,
                phoneNumber: review.tenant.phoneNumber,
            } : review.tenantId,
            tenantName: review.tenantName,
            rating: Number(review.rating || 0),
            comment: review.comment,
            moderation: {
                score: review.moderationScore,
                riskLevel: review.moderationRiskLevel,
                flags: parseVerificationFlags(review.moderationFlags),
            },
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
        })),
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
    };
};

const normalizeMonthValue = (value) => {
    const month = String(value || '').trim();
    return /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
};

const buildSslTransactionId = ({ propertyId, tenantId, month }) => {
    const p = String(propertyId || '').slice(-6);
    const t = String(tenantId || '').slice(-6);
    const m = String(month || '').replace('-', '');
    const stamp = Date.now();
    return `SSL-${m}-${p}-${t}-${stamp}`;
};

const getRequestOrigin = (req) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
};

const getFrontendBaseUrl = (req) => {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
};

const getPublicApiBaseUrl = (req) => {
    return process.env.PUBLIC_API_BASE_URL || getRequestOrigin(req);
};

const getCallbackPayload = (req) => {
    return {
        ...req.query,
        ...req.body,
    };
};

const appendQueryToUrl = (url, params = {}) => {
    const urlObj = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            urlObj.searchParams.set(key, String(value));
        }
    });
    return urlObj.toString();
};

const redirectToFrontend = (req, path, params = {}) => {
    const base = getFrontendBaseUrl(req);
    const target = appendQueryToUrl(`${base}${path}`, params);
    return target;
};

const normalizeAmenities = (amenities) => {
    if (!amenities) return [];
    if (Array.isArray(amenities)) return amenities;
    if (typeof amenities === 'string') {
        return amenities.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
};

const normalizeRules = (rules = {}) => ({
    gateClosingTime: rules.gateClosingTime || '',
    guestPolicy: rules.guestPolicy || '',
    smokingRules: rules.smokingRules || '',
    attachedBath: Boolean(rules.attachedBath),
    filteredWater: Boolean(rules.filteredWater),
    lift: Boolean(rules.lift),
    wifi: Boolean(rules.wifi),
});

const normalizeAmenityQuery = (amenities) => {
    if (!amenities) return [];
    if (Array.isArray(amenities)) {
        return amenities.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(amenities).split(',').map((item) => item.trim()).filter(Boolean);
};

const containsIgnoreCase = (source = '', target = '') => {
    return String(source).toLowerCase().includes(String(target).toLowerCase());
};

const getRuntimeThresholds = async () => {
    const defaults = getDefaultThresholds();
    const db = getDbClient();
    const settings = await db.intelligenceSettings.findUnique({ where: { key: 'global' } });
    return resolveThresholds(settings?.thresholds || defaults);
};

const toNumeric = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
};

const sanitizeThresholdInput = (input = {}) => {
    const clean = {
        fraud: {
            medium: toNumeric(input?.fraud?.medium),
            high: toNumeric(input?.fraud?.high),
        },
        risk: {
            medium: toNumeric(input?.risk?.medium),
            high: toNumeric(input?.risk?.high),
        },
        pricing: {
            lowOccupancy: toNumeric(input?.pricing?.lowOccupancy),
            highOccupancy: toNumeric(input?.pricing?.highOccupancy),
            strongQuality: toNumeric(input?.pricing?.strongQuality),
            weakQuality: toNumeric(input?.pricing?.weakQuality),
            strongCommute: toNumeric(input?.pricing?.strongCommute),
            weakCommute: toNumeric(input?.pricing?.weakCommute),
        },
        quality: {
            gradeA: toNumeric(input?.quality?.gradeA),
            gradeB: toNumeric(input?.quality?.gradeB),
            gradeC: toNumeric(input?.quality?.gradeC),
        },
    };

    Object.keys(clean).forEach((section) => {
        Object.keys(clean[section]).forEach((key) => {
            if (clean[section][key] === undefined) {
                delete clean[section][key];
            }
        });
        if (Object.keys(clean[section]).length === 0) {
            delete clean[section];
        }
    });

    return clean;
};

const validateThresholdPayload = (payload) => {
    const errors = [];

    const checkRange = (value, min, max, name) => {
        if (value === undefined) return;
        if (value < min || value > max) {
            errors.push(`${name} must be between ${min} and ${max}.`);
        }
    };

    checkRange(payload?.fraud?.medium, 0, 100, 'fraud.medium');
    checkRange(payload?.fraud?.high, 0, 100, 'fraud.high');
    checkRange(payload?.risk?.medium, 0, 100, 'risk.medium');
    checkRange(payload?.risk?.high, 0, 100, 'risk.high');
    checkRange(payload?.pricing?.lowOccupancy, 0, 1, 'pricing.lowOccupancy');
    checkRange(payload?.pricing?.highOccupancy, 0, 1, 'pricing.highOccupancy');
    checkRange(payload?.pricing?.strongQuality, 0, 100, 'pricing.strongQuality');
    checkRange(payload?.pricing?.weakQuality, 0, 100, 'pricing.weakQuality');
    checkRange(payload?.pricing?.strongCommute, 0, 100, 'pricing.strongCommute');
    checkRange(payload?.pricing?.weakCommute, 0, 100, 'pricing.weakCommute');
    checkRange(payload?.quality?.gradeA, 0, 100, 'quality.gradeA');
    checkRange(payload?.quality?.gradeB, 0, 100, 'quality.gradeB');
    checkRange(payload?.quality?.gradeC, 0, 100, 'quality.gradeC');

    const fraud = payload?.fraud || {};
    if (fraud.medium !== undefined && fraud.high !== undefined && fraud.medium >= fraud.high) {
        errors.push('fraud.medium must be lower than fraud.high.');
    }

    const risk = payload?.risk || {};
    if (risk.medium !== undefined && risk.high !== undefined && risk.medium >= risk.high) {
        errors.push('risk.medium must be lower than risk.high.');
    }

    const quality = payload?.quality || {};
    if (quality.gradeA !== undefined && quality.gradeB !== undefined && quality.gradeA <= quality.gradeB) {
        errors.push('quality.gradeA must be higher than quality.gradeB.');
    }
    if (quality.gradeB !== undefined && quality.gradeC !== undefined && quality.gradeB <= quality.gradeC) {
        errors.push('quality.gradeB must be higher than quality.gradeC.');
    }

    return errors;
};

const getSmartMatchForProperty = (property, preferences = {}) => {
    const parts = [];

    const availableSeats = Number(property.availableSeats || 0);
    const totalSeats = Math.max(1, Number(property.totalSeats || 1));
    parts.push({
        key: 'availability',
        weight: 20,
        score: Math.max(0, Math.min(1, availableSeats / totalSeats)),
    });

    const hasBudgetPreference = preferences.minRent !== undefined || preferences.maxRent !== undefined;
    if (hasBudgetPreference) {
        const rent = Number(property.monthlyRentPerSeat || 0);
        const minRent = preferences.minRent;
        const maxRent = preferences.maxRent;

        let budgetScore = 1;
        if (minRent !== undefined && rent < minRent) {
            budgetScore = Math.max(0, 1 - ((minRent - rent) / Math.max(minRent, 1)));
        }
        if (maxRent !== undefined && rent > maxRent) {
            budgetScore = Math.max(0, 1 - ((rent - maxRent) / Math.max(maxRent, 1)));
        }

        parts.push({ key: 'budget', weight: 20, score: budgetScore });
    }

    if (preferences.area) {
        parts.push({
            key: 'area',
            weight: 15,
            score: containsIgnoreCase(property.area, preferences.area) ? 1 : 0,
        });
    }

    if (preferences.nearbyUniversity) {
        parts.push({
            key: 'nearbyUniversity',
            weight: 10,
            score: containsIgnoreCase(property.nearbyUniversity || '', preferences.nearbyUniversity) ? 1 : 0,
        });
    }

    if (preferences.genderPreference) {
        parts.push({
            key: 'genderPreference',
            weight: 10,
            score: property.genderPreference === preferences.genderPreference ? 1 : 0,
        });
    }

    if (preferences.roomType) {
        parts.push({
            key: 'roomType',
            weight: 10,
            score: property.roomType === preferences.roomType ? 1 : 0,
        });
    }

    if (preferences.amenities.length > 0) {
        const availableAmenitySet = new Set((property.amenities || []).map((item) => String(item).toLowerCase()));
        const matchCount = preferences.amenities.filter((item) => availableAmenitySet.has(String(item).toLowerCase())).length;
        parts.push({
            key: 'amenities',
            weight: 15,
            score: matchCount / preferences.amenities.length,
        });
    }

    const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0) || 1;
    const weightedScore = parts.reduce((sum, part) => sum + (part.score * part.weight), 0);
    const matchScore = Math.round((weightedScore / totalWeight) * 100);

    return {
        matchScore,
        matchBreakdown: parts.map((part) => ({
            key: part.key,
            weight: part.weight,
            score: Math.round(part.score * 100),
        })),
    };
};

const buildPropertyIntelligence = (property, marketMedianRent = 0, thresholds = null) => {
    const quality = scoreListingQuality(property, thresholds);
    const commute = computeCommuteScore(property);
    const occupancyRatio = Number(property.totalSeats || 0) > 0
        ? (Number(property.totalSeats || 0) - Number(property.availableSeats || 0)) / Number(property.totalSeats || 1)
        : 0;
    const pricing = recommendDynamicPrice(property, {
        marketMedian: marketMedianRent || Number(property.monthlyRentPerSeat || 0),
        occupancyRatio,
        qualityScore: quality.score,
        commuteScore: commute.score,
    }, thresholds);

    return {
        listingQuality: quality,
        commuteScore: commute,
        pricingRecommendation: pricing,
    };
};

// @desc    Get all seat listings with pagination, search, and filters
// @route   GET /api/properties
// @access  Public
const getProperties = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    if (postgresModeEnabled()) {
        const db = getDbClient();
        const sortBy = req.query.sortBy;
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const where = {
            isActive: true,
            publicationStatus: 'Approved',
        };

        if (req.query.area) {
            where.area = { contains: String(req.query.area), mode: 'insensitive' };
        }
        if (req.query.nearbyUniversity) {
            where.nearbyUniversity = { contains: String(req.query.nearbyUniversity), mode: 'insensitive' };
        }
        if (req.query.genderPreference) {
            where.genderPreference = toDbEnum(req.query.genderPreference);
        }
        if (req.query.roomType) {
            where.roomType = toDbEnum(req.query.roomType);
        }
        if (req.query.minRent || req.query.maxRent) {
            where.monthlyRentPerSeat = {};
            if (req.query.minRent) where.monthlyRentPerSeat.gte = Number(req.query.minRent);
            if (req.query.maxRent) where.monthlyRentPerSeat.lte = Number(req.query.maxRent);
        }

        const shouldApplySmartMatch = req.query.smartMatch === 'true' || sortBy === 'smartMatch';
        const smartPreferences = {
            minRent: req.query.minRent ? Number(req.query.minRent) : undefined,
            maxRent: req.query.maxRent ? Number(req.query.maxRent) : undefined,
            area: req.query.area ? String(req.query.area).trim() : '',
            nearbyUniversity: req.query.nearbyUniversity ? String(req.query.nearbyUniversity).trim() : '',
            genderPreference: req.query.genderPreference ? String(req.query.genderPreference).trim() : '',
            roomType: req.query.roomType ? String(req.query.roomType).trim() : '',
            amenities: normalizeAmenityQuery(req.query.amenities),
        };

        const orderBy = (() => {
            switch (sortBy) {
                case 'priceLowToHigh':
                    return { monthlyRentPerSeat: 'asc' };
                case 'priceHighToLow':
                    return { monthlyRentPerSeat: 'desc' };
                case 'availability':
                    return { availableSeats: 'desc' };
                case 'popularity':
                    return { views: 'desc' };
                case 'smartMatch':
                    return { createdAt: 'desc' };
                default:
                    return { createdAt: sortOrder };
            }
        })();

        if (shouldApplySmartMatch) {
            const allRows = await db.property.findMany({
                where,
                include: {
                    landlord: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            let allProperties = allRows.map(mapDbProperty);

            if (smartPreferences.amenities.length > 0) {
                allProperties = allProperties.filter((property) => {
                    const propertyAmenitySet = new Set((property.amenities || []).map((item) => String(item).toLowerCase()));
                    return smartPreferences.amenities.every((amenity) => propertyAmenitySet.has(String(amenity).toLowerCase()));
                });
            }

            const rents = allProperties.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
            const marketMedianRent = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;

            const scoredProperties = allProperties.map((property) => {
                const match = getSmartMatchForProperty(property, smartPreferences);
                const intelligence = buildPropertyIntelligence(property, marketMedianRent, thresholds);
                return {
                    ...property,
                    matchScore: match.matchScore,
                    matchBreakdown: match.matchBreakdown,
                    ...intelligence,
                };
            });

            scoredProperties.sort((left, right) => {
                if (right.matchScore !== left.matchScore) return right.matchScore - left.matchScore;
                return new Date(right.createdAt) - new Date(left.createdAt);
            });

            const totalProperties = scoredProperties.length;
            const properties = scoredProperties.slice(skip, skip + limit);
            const totalPages = Math.ceil(totalProperties / limit);

            return res.json({
                properties,
                currentPage: page,
                totalPages,
                totalProperties,
            });
        }

        let rows = await db.property.findMany({
            where,
            include: {
                landlord: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        phoneNumber: true,
                        role: true,
                    },
                },
            },
            orderBy,
        });

        let properties = rows.map(mapDbProperty);

        if (smartPreferences.amenities.length > 0) {
            properties = properties.filter((property) => {
                const propertyAmenitySet = new Set((property.amenities || []).map((item) => String(item).toLowerCase()));
                return smartPreferences.amenities.every((amenity) => propertyAmenitySet.has(String(amenity).toLowerCase()));
            });
        }

        const totalProperties = properties.length;
        const pagedProperties = properties.slice(skip, skip + limit);
        const rents = properties.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
        const marketMedianRent = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;

        const enriched = pagedProperties.map((property) => ({
            ...property,
            ...buildPropertyIntelligence(property, marketMedianRent, thresholds),
        }));

        const totalPages = Math.ceil(totalProperties / limit);
        return res.json({
            properties: enriched,
            currentPage: page,
            totalPages,
            totalProperties,
        });
    }

    const sortOptions = {};
    const sortBy = req.query.sortBy;
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
        case 'priceLowToHigh':
            sortOptions.monthlyRentPerSeat = 1;
            break;
        case 'priceHighToLow':
            sortOptions.monthlyRentPerSeat = -1;
            break;
        case 'availability':
            sortOptions.availableSeats = -1;
            break;
        case 'popularity':
            sortOptions.views = -1;
            break;
        case 'smartMatch':
            sortOptions.createdAt = -1;
            break;
        default:
            sortOptions.createdAt = sortOrder;
    }

    const query = { isActive: true, publicationStatus: 'Approved' };

    if (req.query.area) {
        query.area = { $regex: req.query.area, $options: 'i' };
    }
    if (req.query.nearbyUniversity) {
        query.nearbyUniversity = { $regex: req.query.nearbyUniversity, $options: 'i' };
    }
    if (req.query.genderPreference) {
        query.genderPreference = req.query.genderPreference;
    }
    if (req.query.roomType) {
        query.roomType = req.query.roomType;
    }
    if (req.query.minRent || req.query.maxRent) {
        query.monthlyRentPerSeat = {};
        if (req.query.minRent) query.monthlyRentPerSeat.$gte = Number(req.query.minRent);
        if (req.query.maxRent) query.monthlyRentPerSeat.$lte = Number(req.query.maxRent);
    }
    if (req.query.amenities) {
        const amenities = normalizeAmenityQuery(req.query.amenities);
        query.amenities = { $all: amenities.map((item) => item.trim()).filter(Boolean) };
    }

    const shouldApplySmartMatch = req.query.smartMatch === 'true' || sortBy === 'smartMatch';
    const smartPreferences = {
        minRent: req.query.minRent ? Number(req.query.minRent) : undefined,
        maxRent: req.query.maxRent ? Number(req.query.maxRent) : undefined,
        area: req.query.area ? String(req.query.area).trim() : '',
        nearbyUniversity: req.query.nearbyUniversity ? String(req.query.nearbyUniversity).trim() : '',
        genderPreference: req.query.genderPreference ? String(req.query.genderPreference).trim() : '',
        roomType: req.query.roomType ? String(req.query.roomType).trim() : '',
        amenities: normalizeAmenityQuery(req.query.amenities),
    };

    let properties = [];
    let totalProperties = 0;

    if (shouldApplySmartMatch) {
        const allProperties = await Property.find(query)
            .populate('landlord', 'fullName username email phoneNumber role')
            .sort({ createdAt: -1 });

        const rents = allProperties.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
        const marketMedianRent = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;

        const scoredProperties = allProperties.map((propertyDoc) => {
            const property = propertyDoc.toObject();
            const match = getSmartMatchForProperty(property, smartPreferences);
            const intelligence = buildPropertyIntelligence(property, marketMedianRent, thresholds);
            return {
                ...property,
                matchScore: match.matchScore,
                matchBreakdown: match.matchBreakdown,
                ...intelligence,
            };
        });

        scoredProperties.sort((left, right) => {
            if (right.matchScore !== left.matchScore) return right.matchScore - left.matchScore;
            return new Date(right.createdAt) - new Date(left.createdAt);
        });

        totalProperties = scoredProperties.length;
        properties = scoredProperties.slice(skip, skip + limit);
    } else {
        const rawProperties = await Property.find(query)
            .populate('landlord', 'fullName username email phoneNumber role')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        const rents = rawProperties.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
        const marketMedianRent = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;

        properties = rawProperties.map((propertyDoc) => {
            const property = propertyDoc.toObject();
            return {
                ...property,
                ...buildPropertyIntelligence(property, marketMedianRent, thresholds),
            };
        });

        totalProperties = await Property.countDocuments(query);
    }

    const totalPages = Math.ceil(totalProperties / limit);

    res.json({
        properties,
        currentPage: page,
        totalPages,
        totalProperties,
    });
});

// @desc    Get single seat listing by ID
// @route   GET /api/properties/:id
// @access  Public
const getPropertyById = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    let property;

    if (postgresModeEnabled()) {
        const db = getDbClient();
        const row = await db.property.findUnique({
            where: { id: req.params.id },
            include: {
                landlord: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        phoneNumber: true,
                        role: true,
                    },
                },
                seatApplications: {
                    include: {
                        tenant: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                rentPayments: {
                    include: {
                        tenant: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
                reviews: {
                    include: {
                        tenant: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                email: true,
                                phoneNumber: true,
                            },
                        },
                    },
                },
            },
        });

        if (!row) {
            res.status(404);
            throw new Error('Property not found');
        }

        await db.property.update({
            where: { id: row.id },
            data: { views: { increment: 1 } },
        });

        const propertyObj = mapDbProperty({ ...row, views: Number(row.views || 0) + 1 });
        const intelligence = buildPropertyIntelligence(propertyObj, Number(propertyObj.monthlyRentPerSeat || 0), thresholds);
        const averageRating = (propertyObj.reviews || []).length > 0
            ? Number(((propertyObj.reviews || []).reduce((sum, review) => sum + Number(review.rating || 0), 0) / (propertyObj.reviews || []).length).toFixed(1))
            : 0;

        return res.json({
            ...propertyObj,
            ...intelligence,
            reviewSummary: {
                averageRating,
                totalReviews: (propertyObj.reviews || []).length,
            },
        });
    }

    try {
        property = await Property.findById(req.params.id).populate('landlord', 'fullName username email phoneNumber role');
    } catch (dbError) {
        res.status(400);
        throw new Error(`Invalid property ID format: ${req.params.id}`);
    }

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    property.views = (property.views || 0) + 1;
    await property.save();

    const propertyObj = property.toObject();
    const intelligence = buildPropertyIntelligence(propertyObj, Number(propertyObj.monthlyRentPerSeat || 0), thresholds);
    const averageRating = (propertyObj.reviews || []).length > 0
        ? Number(((propertyObj.reviews || []).reduce((sum, review) => sum + Number(review.rating || 0), 0) / (propertyObj.reviews || []).length).toFixed(1))
        : 0;

    res.json({
        ...propertyObj,
        ...intelligence,
        reviewSummary: {
            averageRating,
            totalReviews: (propertyObj.reviews || []).length,
        },
    });
});

// @desc    Add a new seat listing
// @route   POST /api/properties
// @access  Private
const addProperty = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    const {
        title,
        area,
        nearbyUniversity,
        address,
        mapLocation,
        totalSeats,
        availableSeats,
        genderPreference,
        roomType,
        monthlyRentPerSeat,
        securityDeposit,
        mealSystem,
        amenities,
        rules,
        photos,
        description,
        universityProximity,
        commuteMinutes,
        landlordWhatsapp,
        landlordBkash,
        landlordNagad,
        rentalMonth,
    } = req.body;

    if (!title || !area || !address || !totalSeats || !monthlyRentPerSeat || !genderPreference || !roomType) {
        res.status(400);
        throw new Error('Please enter all required seat listing fields.');
    }

    if (!['Landlord', 'Admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Only Landlord or Admin accounts can publish seat listings.');
    }

    if (req.user.role === 'Landlord') {
        if (req.user.verificationType !== 'NID') {
            res.status(403);
            throw new Error('Landlord accounts must be registered with NID verification.');
        }

        if (req.user.verificationStatus !== 'Verified') {
            res.status(403);
            throw new Error('Landlord account verification is pending. Please wait for admin approval.');
        }
    }

    if (!Array.isArray(photos) || photos.length === 0) {
        res.status(400);
        throw new Error('Please upload at least one room image.');
    }

    const landlordName = req.user.fullName || req.user.username || req.user.email;

    const normalizedMap = mapLocation && typeof mapLocation === 'object' ? mapLocation : {};
    const normalizedRules = normalizeRules(rules);

    const createdPropertyRow = await db.property.create({
        data: {
            landlordId: String(req.user._id),
            landlordName,
            landlordPhone: req.user.phoneNumber || null,
            landlordWhatsapp: landlordWhatsapp || req.user.phoneNumber || null,
            landlordBkash: landlordBkash || null,
            landlordNagad: landlordNagad || null,
            rentalMonth: rentalMonth || null,
            title,
            area,
            nearbyUniversity: nearbyUniversity || null,
            address,
            mapLatitude: normalizedMap.latitude !== undefined ? Number(normalizedMap.latitude) : null,
            mapLongitude: normalizedMap.longitude !== undefined ? Number(normalizedMap.longitude) : null,
            mapLabel: normalizedMap.label || null,
            mapLink: normalizedMap.link || null,
            totalSeats: Number(totalSeats),
            availableSeats: Number(availableSeats ?? totalSeats),
            genderPreference: toDbEnum(genderPreference),
            roomType: toDbEnum(roomType),
            monthlyRentPerSeat: Number(monthlyRentPerSeat),
            securityDeposit: Number(securityDeposit || 0),
            mealSystem: toDbEnum(mealSystem || 'Mixed'),
            amenities: JSON.stringify(normalizeAmenities(amenities)),
            gateClosingTime: normalizedRules.gateClosingTime || null,
            guestPolicy: normalizedRules.guestPolicy || null,
            smokingRules: normalizedRules.smokingRules || null,
            attachedBath: Boolean(normalizedRules.attachedBath),
            filteredWater: Boolean(normalizedRules.filteredWater),
            lift: Boolean(normalizedRules.lift),
            wifi: Boolean(normalizedRules.wifi),
            photos: JSON.stringify(photos),
            description: description || null,
            universityProximity: universityProximity || null,
            commuteMinutes: commuteMinutes !== undefined && commuteMinutes !== null ? Number(commuteMinutes) : null,
            publicationStatus: req.user.role === 'Admin' ? 'Approved' : 'Pending',
        },
        include: {
            landlord: {
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                    role: true,
                },
            },
        },
    });

    const createdProperty = mapDbProperty(createdPropertyRow);
    const quality = scoreListingQuality(createdProperty, thresholds);

    if (req.user.role !== 'Landlord' && req.user.role !== 'Admin') {
        await db.user.update({
            where: { id: String(req.user._id) },
            data: { role: 'Landlord' },
        });
    }

    res.status(201).json({
        ...createdProperty,
        listingQuality: quality,
        listingQualityMessage: quality.score >= 70
            ? 'Listing quality looks strong.'
            : 'Listing saved, but quality can be improved for better tenant trust.',
    });
});

// @desc    Get current landlord/admin listings
// @route   GET /api/properties/mine
// @access  Private
const getMyProperties = asyncHandler(async (req, res) => {
    if (postgresModeEnabled()) {
        const db = getDbClient();
        const where = req.user.role === 'Admin' ? {} : { landlordId: String(req.user._id) };
        const rows = await db.property.findMany({
            where,
            include: {
                landlord: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        phoneNumber: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({ success: true, properties: rows.map(mapDbProperty) });
    }

    const query = req.user.role === 'Admin' ? {} : { landlord: req.user._id };

    const properties = await Property.find(query)
        .populate('landlord', 'fullName username email phoneNumber role')
        .sort({ createdAt: -1 });

    res.status(200).json({ success: true, properties });
});

// @desc    Get pending property publication approvals
// @route   GET /api/properties/admin/pending-publications
// @access  Private/Admin
const getPendingPublications = asyncHandler(async (req, res) => {
    if (postgresModeEnabled()) {
        const db = getDbClient();
        const rows = await db.property.findMany({
            where: { publicationStatus: 'Pending' },
            include: {
                landlord: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        phoneNumber: true,
                        role: true,
                        verificationType: true,
                        verificationStatus: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({ success: true, properties: rows.map(mapDbProperty) });
    }

    const properties = await Property.find({ publicationStatus: 'Pending' })
        .populate('landlord', 'fullName username email phoneNumber role verificationType verificationStatus')
        .sort({ createdAt: -1 });

    res.status(200).json({ success: true, properties });
});

// @desc    Approve or reject property publication
// @route   PATCH /api/properties/admin/:id/publication
// @access  Private/Admin
const reviewPropertyPublication = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
        res.status(400);
        throw new Error('Status must be Approved or Rejected.');
    }

    if (postgresModeEnabled()) {
        const db = getDbClient();
        const property = await db.property.findUnique({ where: { id: req.params.id } });
        if (!property) {
            res.status(404);
            throw new Error('Property not found');
        }

        const updated = await db.property.update({
            where: { id: property.id },
            data: { publicationStatus: toDbEnum(status) },
        });

        return res.status(200).json({ success: true, message: `Property ${status.toLowerCase()} successfully.`, property: mapDbProperty(updated) });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    property.publicationStatus = status;
    await property.save();

    res.status(200).json({ success: true, message: `Property ${status.toLowerCase()} successfully.`, property });
});

// @desc    Update a seat listing
// @route   PATCH /api/properties/:id
// @access  Private
const updateProperty = asyncHandler(async (req, res) => {
    const db = getDbClient();
    const property = await db.property.findUnique({ where: { id: req.params.id } });

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canEdit = String(property.landlordId) === String(req.user._id) || req.user.role === 'Admin';
    if (!canEdit) {
        res.status(403);
        throw new Error('You are not allowed to edit this listing');
    }

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.area !== undefined) data.area = req.body.area;
    if (req.body.nearbyUniversity !== undefined) data.nearbyUniversity = req.body.nearbyUniversity || null;
    if (req.body.address !== undefined) data.address = req.body.address;
    if (req.body.totalSeats !== undefined) data.totalSeats = Number(req.body.totalSeats);
    if (req.body.availableSeats !== undefined) data.availableSeats = Number(req.body.availableSeats);
    if (req.body.genderPreference !== undefined) data.genderPreference = toDbEnum(req.body.genderPreference);
    if (req.body.roomType !== undefined) data.roomType = toDbEnum(req.body.roomType);
    if (req.body.monthlyRentPerSeat !== undefined) data.monthlyRentPerSeat = Number(req.body.monthlyRentPerSeat);
    if (req.body.securityDeposit !== undefined) data.securityDeposit = Number(req.body.securityDeposit);
    if (req.body.mealSystem !== undefined) data.mealSystem = toDbEnum(req.body.mealSystem);
    if (req.body.description !== undefined) data.description = req.body.description || null;
    if (req.body.universityProximity !== undefined) data.universityProximity = req.body.universityProximity || null;
    if (req.body.commuteMinutes !== undefined) data.commuteMinutes = req.body.commuteMinutes !== null ? Number(req.body.commuteMinutes) : null;
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    if (req.body.landlordWhatsapp !== undefined) data.landlordWhatsapp = req.body.landlordWhatsapp || null;
    if (req.body.landlordBkash !== undefined) data.landlordBkash = req.body.landlordBkash || null;
    if (req.body.landlordNagad !== undefined) data.landlordNagad = req.body.landlordNagad || null;
    if (req.body.rentalMonth !== undefined) data.rentalMonth = req.body.rentalMonth || null;

    if (req.body.mapLocation !== undefined) {
        const mapLocation = req.body.mapLocation || {};
        data.mapLatitude = mapLocation.latitude !== undefined ? Number(mapLocation.latitude) : null;
        data.mapLongitude = mapLocation.longitude !== undefined ? Number(mapLocation.longitude) : null;
        data.mapLabel = mapLocation.label || null;
        data.mapLink = mapLocation.link || null;
    }

    if (req.body.amenities !== undefined) {
        data.amenities = JSON.stringify(normalizeAmenities(req.body.amenities));
    }

    if (req.body.rules !== undefined) {
        const normalizedRules = normalizeRules(req.body.rules);
        data.gateClosingTime = normalizedRules.gateClosingTime || null;
        data.guestPolicy = normalizedRules.guestPolicy || null;
        data.smokingRules = normalizedRules.smokingRules || null;
        data.attachedBath = Boolean(normalizedRules.attachedBath);
        data.filteredWater = Boolean(normalizedRules.filteredWater);
        data.lift = Boolean(normalizedRules.lift);
        data.wifi = Boolean(normalizedRules.wifi);
    }

    if (req.body.photos !== undefined && Array.isArray(req.body.photos)) {
        data.photos = JSON.stringify(req.body.photos);
    }

    const updatedProperty = await db.property.update({
        where: { id: property.id },
        data,
        include: {
            landlord: {
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                    role: true,
                },
            },
        },
    });

    res.json(mapDbProperty(updatedProperty));
});

// @desc    Apply for a seat
// @route   POST /api/properties/:id/apply
// @access  Private
const applyForSeat = asyncHandler(async (req, res) => {
    if (postgresModeEnabled()) {
        const db = getDbClient();
        const propertyRow = await db.property.findUnique({
            where: { id: req.params.id },
            include: {
                seatApplications: {
                    where: { tenantId: String(req.user._id), status: 'Pending' },
                },
            },
        });

        if (!propertyRow) {
            res.status(404);
            throw new Error('Property not found');
        }

        if (req.user.role !== 'Tenant') {
            res.status(403);
            throw new Error('Only Tenant accounts can apply for seats.');
        }

        const seatsRequested = Number(req.body.seatsRequested || 1);
        if (!Number.isInteger(seatsRequested) || seatsRequested < 1) {
            res.status(400);
            throw new Error('Requested seats must be a whole number of at least 1.');
        }

        if ((propertyRow.seatApplications || []).length > 0) {
            res.status(400);
            throw new Error('You already have a pending request for this seat');
        }

        if (Number(propertyRow.availableSeats || 0) <= 0) {
            res.status(400);
            throw new Error('No seats are currently available');
        }

        if (seatsRequested > Number(propertyRow.availableSeats || 0)) {
            res.status(400);
            throw new Error(`Only ${propertyRow.availableSeats} seat(s) are currently available.`);
        }

        const verification = assessDocumentVerification({
            url: req.body.documentUrl || req.user.verificationDocumentUrl,
            verificationType: req.body.studentIdType || req.user.verificationType || 'Student ID',
            role: 'Tenant',
        });

        await db.seatApplication.create({
            data: {
                propertyId: propertyRow.id,
                tenantId: String(req.user._id),
                tenantName: req.user.fullName || req.user.username || req.user.email,
                tenantEmail: req.user.email,
                tenantPhone: req.user.phoneNumber || null,
                studentIdType: toDbEnum(req.body.studentIdType || req.user.verificationType || 'Student ID'),
                seatsRequested,
                documentUrl: req.body.documentUrl || req.user.verificationDocumentUrl || null,
                verificationScore: verification.score,
                verificationConfidence: verification.confidence,
                verificationStatus: verification.status,
                verificationFlags: JSON.stringify(verification.flags || []),
                roommateRequest: Boolean(req.body.roommateRequest),
                note: req.body.note || '',
                status: 'Pending',
            },
        });

        return res.status(201).json({ success: true, message: 'Seat request submitted successfully.' });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only Tenant accounts can apply for seats.');
    }

    const seatsRequested = Number(req.body.seatsRequested || 1);
    if (!Number.isInteger(seatsRequested) || seatsRequested < 1) {
        res.status(400);
        throw new Error('Requested seats must be a whole number of at least 1.');
    }

    const alreadyApplied = property.seatApplications.some(
        (application) => String(application.tenant) === String(req.user._id) && application.status === 'Pending'
    );

    if (alreadyApplied) {
        res.status(400);
        throw new Error('You already have a pending request for this seat');
    }

    if (property.availableSeats <= 0) {
        res.status(400);
        throw new Error('No seats are currently available');
    }

    if (seatsRequested > property.availableSeats) {
        res.status(400);
        throw new Error(`Only ${property.availableSeats} seat(s) are currently available.`);
    }

    property.seatApplications.push({
        tenant: req.user._id,
        tenantName: req.user.fullName || req.user.username || req.user.email,
        tenantEmail: req.user.email,
        tenantPhone: req.user.phoneNumber,
        studentIdType: req.body.studentIdType || req.user.verificationType || 'Student ID',
        seatsRequested,
        documentUrl: req.body.documentUrl || req.user.verificationDocumentUrl,
        documentVerification: assessDocumentVerification({
            url: req.body.documentUrl || req.user.verificationDocumentUrl,
            verificationType: req.body.studentIdType || req.user.verificationType || 'Student ID',
            role: 'Tenant',
        }),
        roommateRequest: Boolean(req.body.roommateRequest),
        note: req.body.note || '',
    });

    await property.save();
    res.status(201).json({ success: true, message: 'Seat request submitted successfully.' });
});

// @desc    Approve or reject a seat request
// @route   PATCH /api/properties/:id/applications/:applicationId
// @access  Private/Landlord
const reviewApplication = asyncHandler(async (req, res) => {
    if (postgresModeEnabled()) {
        const db = getDbClient();
        const property = await db.property.findUnique({ where: { id: req.params.id } });

        if (!property) {
            res.status(404);
            throw new Error('Property not found');
        }

        const application = await db.seatApplication.findFirst({
            where: {
                id: req.params.applicationId,
                propertyId: property.id,
            },
        });

        if (!application) {
            res.status(404);
            throw new Error('Application not found');
        }

        const canReview = String(property.landlordId) === String(req.user._id);
        if (!canReview) {
            res.status(403);
            throw new Error('Only the landlord of this property can review applications.');
        }

        const nextStatus = req.body.status;
        if (!['Approved', 'Rejected'].includes(nextStatus)) {
            res.status(400);
            throw new Error('Invalid application status');
        }

        const seatsRequested = Number(application.seatsRequested || 1);
        let seatDelta = 0;

        if (fromDbEnum(application.status) === 'Approved' && nextStatus === 'Rejected') {
            seatDelta = seatsRequested;
        }

        if (fromDbEnum(application.status) !== 'Approved' && nextStatus === 'Approved') {
            if (Number(property.availableSeats || 0) < seatsRequested) {
                res.status(400);
                throw new Error('Not enough available seats to approve this booking request.');
            }
            seatDelta = -seatsRequested;
        }

        await db.$transaction(async (tx) => {
            await tx.seatApplication.update({
                where: { id: application.id },
                data: { status: toDbEnum(nextStatus) },
            });

            if (seatDelta !== 0) {
                await tx.property.update({
                    where: { id: property.id },
                    data: { availableSeats: { increment: seatDelta } },
                });
            }
        });

        return res.json({ success: true, message: `Application ${nextStatus.toLowerCase()}.` });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const application = property.seatApplications.id(req.params.applicationId);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    const canReview = String(property.landlord) === String(req.user._id);
    if (!canReview) {
        res.status(403);
        throw new Error('Only the landlord of this property can review applications.');
    }

    const nextStatus = req.body.status;
    if (!['Approved', 'Rejected'].includes(nextStatus)) {
        res.status(400);
        throw new Error('Invalid application status');
    }

    const seatsRequested = Number(application.seatsRequested || 1);

    if (application.status === 'Approved' && nextStatus === 'Rejected') {
        property.availableSeats += seatsRequested;
    }

    if (application.status !== 'Approved' && nextStatus === 'Approved') {
        if (property.availableSeats < seatsRequested) {
            res.status(400);
            throw new Error('Not enough available seats to approve this booking request.');
        }
        property.availableSeats -= seatsRequested;
    }

    application.status = nextStatus;
    await property.save();

    res.json({ success: true, message: `Application ${nextStatus.toLowerCase()}.` });
});

const getApprovedTenantBooking = (property, userId) => {
    return (property.seatApplications || []).find(
        (application) => String(application.tenant?._id || application.tenant?.id || application.tenant || application.tenantId) === String(userId)
            && application.status === 'Approved'
    );
};

const findPropertyAndPaymentByTransaction = async (transactionId) => {
    if (!transactionId) return { property: null, payment: null };
    const db = getDbClient();
    const payment = await db.rentPayment.findUnique({
        where: { transactionId },
        include: {
            tenant: {
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                },
            },
            property: {
                include: {
                    landlord: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });

    if (!payment) return { property: null, payment: null };

    const property = mapDbProperty({
        ...payment.property,
        rentPayments: [payment],
    });

    return {
        property,
        payment: property.rentPayments?.[0] || null,
    };
};

const buildSlipDownloadUrl = (req, propertyId, paymentId) => {
    return `${getPublicApiBaseUrl(req)}/api/properties/${propertyId}/payments/${paymentId}/slip`;
};

// @desc    Initiate SSLCommerz payment session
// @route   POST /api/properties/:id/payments/ssl/initiate
// @access  Private/Tenant
const initiateSslRentPayment = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    const propertyRow = await db.property.findUnique({
        where: { id: req.params.id },
        include: {
            seatApplications: {
                where: {
                    tenantId: String(req.user._id),
                    status: 'Approved',
                },
            },
        },
    });

    const property = propertyRow ? mapDbProperty(propertyRow) : null;

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only tenant accounts can initiate SSL payments.');
    }

    const approvedBooking = getApprovedTenantBooking(property, req.user._id);
    if (!approvedBooking) {
        res.status(403);
        throw new Error('You must have an approved seat request before making payment.');
    }

    const month = normalizeMonthValue(req.body.month || property.rentalMonth);
    const preferredPaymentMethod = String(req.body.paymentMethod || 'bKash').trim();
    const allowedPaymentMethods = ['bKash', 'Nagad', 'Rocket', 'Card'];
    if (!allowedPaymentMethods.includes(preferredPaymentMethod)) {
        res.status(400);
        throw new Error('Invalid SSL payment method selection.');
    }
    const seatsBooked = Number(approvedBooking.seatsRequested || 1);
    const expectedAmount = Number(property.monthlyRentPerSeat || 0) * seatsBooked;
    const amount = Number(req.body.amount || expectedAmount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400);
        throw new Error('Invalid payment amount.');
    }

    const duplicatePayment = await db.rentPayment.findFirst({
        where: {
            propertyId: property.id,
            tenantId: String(req.user._id),
            month,
            status: { notIn: ['Rejected', 'Failed', 'Cancelled'] },
        },
    });

    if (duplicatePayment) {
        res.status(400);
        throw new Error('A payment request already exists for this month.');
    }

    const transactionId = buildSslTransactionId({ propertyId: property.id, tenantId: req.user._id, month });

    const paymentAssistant = buildPaymentAssistant({
        provider: 'SSLCommerz',
        transactionId,
        amount,
        monthlyRentPerSeat: property.monthlyRentPerSeat,
        seatsBooked,
    });

    const createdPayment = await db.rentPayment.create({
        data: {
            propertyId: property.id,
            tenantId: String(req.user._id),
            month,
            amount,
            provider: 'SSLCommerz',
            transactionId,
            status: 'Pending',
            source: 'SSLCommerz',
            sslPreferredMethod: preferredPaymentMethod,
            assistantStatus: paymentAssistant.status,
            assistantFlags: JSON.stringify(paymentAssistant.flags || []),
            assistantExpectedAmount: paymentAssistant.expectedAmount != null ? Number(paymentAssistant.expectedAmount) : null,
            assistantPaidAmount: paymentAssistant.paidAmount != null ? Number(paymentAssistant.paidAmount) : null,
        },
    });

    const successPath = '/api/properties/payments/ssl/success';
    const failPath = '/api/properties/payments/ssl/fail';
    const cancelPath = '/api/properties/payments/ssl/cancel';
    const callbackBase = getPublicApiBaseUrl(req);
    const successUrl = `${callbackBase}${successPath}`;
    const failUrl = `${callbackBase}${failPath}`;
    const cancelUrl = `${callbackBase}${cancelPath}`;

    if (!hasSslCredentials()) {
        const mockGatewayUrl = appendQueryToUrl(successUrl, {
            tran_id: transactionId,
            status: 'VALID',
            val_id: `MOCK-${Date.now()}`,
            amount,
            currency: 'BDT',
            bank_tran_id: `BANK-${Date.now()}`,
            card_type: 'SSL Mock Wallet',
            card_issuer: 'Sandbox',
            card_brand: 'MOCK',
            card_sub_brand: 'MOCK',
            value_a: String(property.id),
            value_b: String(createdPayment.id),
            value_c: preferredPaymentMethod,
        });

        return res.status(201).json({
            success: true,
            message: 'SSL sandbox credentials missing, running in local mock mode.',
            paymentId: createdPayment.id,
            transactionId,
            gatewayUrl: mockGatewayUrl,
            mode: 'mock',
            checkoutFlow: {
                paymentMethod: preferredPaymentMethod,
                note: 'Choose method, submit mobile number, OTP, then PIN in SSL flow.',
            },
            paymentAssistant,
        });
    }

    try {
        const sessionPayload = {
            store_id: process.env.SSL_STORE_ID,
            store_passwd: process.env.SSL_STORE_PASSWORD,
            total_amount: amount.toFixed(2),
            currency: 'BDT',
            tran_id: transactionId,
            success_url: successUrl,
            fail_url: failUrl,
            cancel_url: cancelUrl,
            ipn_url: process.env.SSL_IPN_URL || successUrl,
            shipping_method: 'NO',
            product_name: `Rent for ${property.title}`,
            product_category: 'House Rent',
            product_profile: 'general',
            cus_name: req.user.fullName || req.user.username || 'Tenant',
            cus_email: req.user.email || 'tenant@example.com',
            cus_add1: property.address || property.area || 'Dhaka',
            cus_city: 'Dhaka',
            cus_country: 'Bangladesh',
            cus_phone: req.user.phoneNumber || approvedBooking.tenantPhone || '01700000000',
            ship_name: req.user.fullName || req.user.username || 'Tenant',
            ship_add1: property.address || property.area || 'Dhaka',
            ship_city: 'Dhaka',
            ship_country: 'Bangladesh',
            value_a: String(property._id),
            value_b: String(createdPayment._id),
            value_c: String(req.user._id),
            value_d: month,
        };

        const sslSession = await initializeSslSession(sessionPayload);
        if (!sslSession?.GatewayPageURL) {
            await db.rentPayment.update({
                where: { id: createdPayment.id },
                data: {
                    status: 'Failed',
                    sslGatewayStatus: sslSession?.status || 'FAILED_TO_CREATE_SESSION',
                },
            });
            res.status(502);
            throw new Error(sslSession?.failedreason || 'Unable to initialize SSLCommerz session.');
        }

        await db.rentPayment.update({
            where: { id: createdPayment.id },
            data: {
                sslSessionKey: sslSession.sessionkey || '',
                sslGatewayStatus: sslSession.status || 'INITIATED',
            },
        });

        res.status(201).json({
            success: true,
            message: 'SSL payment session initialized successfully.',
            paymentId: createdPayment.id,
            transactionId,
            gatewayUrl: sslSession.GatewayPageURL,
            mode: 'gateway',
            checkoutFlow: {
                paymentMethod: preferredPaymentMethod,
                note: 'Select method, submit mobile number, OTP, then PIN in SSL secure checkout.',
            },
            paymentAssistant,
        });
    } catch (error) {
        await db.rentPayment.update({
            where: { id: createdPayment.id },
            data: {
                status: 'Failed',
                sslGatewayStatus: 'INIT_ERROR',
            },
        });
        throw error;
    }
});

// @desc    Submit rent payment
// @route   POST /api/properties/:id/payments
// @access  Private
const addRentPayment = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    const propertyRow = await db.property.findUnique({
        where: { id: req.params.id },
        include: {
            seatApplications: {
                where: {
                    tenantId: String(req.user._id),
                    status: 'Approved',
                },
            },
        },
    });

    const property = propertyRow ? mapDbProperty(propertyRow) : null;

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only Tenant accounts can submit rent payments.');
    }

    const enforceSslForTenants = String(process.env.ENFORCE_SSL_TENANT_PAYMENTS || 'false').toLowerCase() === 'true';
    if (enforceSslForTenants) {
        res.status(403);
        throw new Error('Manual tenant payments are disabled. Please use SSLCommerz checkout.');
    }

    const approvedApplication = getApprovedTenantBooking(property, req.user._id);

    if (!approvedApplication) {
        res.status(403);
        throw new Error('You must have an approved seat request before submitting rent payment.');
    }

    const payment = {
        tenant: req.user._id,
        month: req.body.month,
        amount: Number(req.body.amount || property.monthlyRentPerSeat),
        provider: req.body.provider,
        transactionId: req.body.transactionId,
        status: 'Pending',
        source: 'Manual',
    };

    if (!payment.month || !payment.provider || !payment.transactionId) {
        res.status(400);
        throw new Error('Month, provider, and transaction ID are required');
    }

    const existingPayment = await db.rentPayment.findFirst({
        where: {
            propertyId: property.id,
            tenantId: String(req.user._id),
            month: payment.month,
            status: { not: 'Rejected' },
        },
    });

    if (existingPayment) {
        res.status(400);
        throw new Error('You already submitted payment for this month on this property.');
    }

    const seatsBooked = Number(approvedApplication.seatsRequested || 1);
    const paymentAssistant = buildPaymentAssistant({
        provider: payment.provider,
        transactionId: payment.transactionId,
        amount: payment.amount,
        monthlyRentPerSeat: property.monthlyRentPerSeat,
        seatsBooked,
    });

    await db.rentPayment.create({
        data: {
            propertyId: property.id,
            tenantId: String(req.user._id),
            month: payment.month,
            amount: Number(payment.amount),
            provider: payment.provider,
            transactionId: payment.transactionId,
            status: 'Pending',
            source: 'Manual',
            assistantStatus: paymentAssistant.status,
            assistantFlags: JSON.stringify(paymentAssistant.flags || []),
            assistantExpectedAmount: paymentAssistant.expectedAmount != null ? Number(paymentAssistant.expectedAmount) : null,
            assistantPaidAmount: paymentAssistant.paidAmount != null ? Number(paymentAssistant.paidAmount) : null,
        },
    });

    res.status(201).json({
        success: true,
        message: 'Rent payment submitted for verification.',
        paymentAssistant,
    });
});

const finalizeSslPayment = async ({ req, transactionId, nextStatus, payload = {}, validation = null }) => {
    const db = getDbClient();
    const existing = await db.rentPayment.findUnique({
        where: { transactionId },
        include: {
            tenant: {
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                },
            },
            property: {
                include: {
                    landlord: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });

    if (!existing) {
        return null;
    }

    if (nextStatus === 'Paid' && fromDbEnum(existing.status) === 'Paid') {
        const property = mapDbProperty({ ...existing.property, rentPayments: [existing] });
        return { property, payment: property.rentPayments?.[0] || null };
    }

    const validatedAmount = Number(validation?.amount || payload.amount || existing.amount || 0);
    await db.rentPayment.update({
        where: { id: existing.id },
        data: {
            status: toDbEnum(nextStatus),
            provider: 'SSLCommerz',
            source: 'SSLCommerz',
            paidAt: nextStatus === 'Paid' ? new Date() : undefined,
            sslValidationId: validation?.val_id || payload.val_id || '',
            sslBankTransactionId: validation?.bank_tran_id || payload.bank_tran_id || '',
            sslCardType: validation?.card_type || payload.card_type || '',
            sslCardIssuer: validation?.card_issuer || payload.card_issuer || '',
            sslCardBrand: validation?.card_brand || payload.card_brand || '',
            sslCardSubtype: validation?.card_sub_brand || payload.card_sub_brand || '',
            sslValidatedAmount: Number.isFinite(validatedAmount) ? validatedAmount : Number(existing.amount || 0),
            sslCurrency: validation?.currency || payload.currency || 'BDT',
            sslGatewayStatus: validation?.status || payload.status || nextStatus,
            slipId: nextStatus === 'Paid' ? `SSL-SLIP-${transactionId}` : undefined,
            slipGeneratedAt: nextStatus === 'Paid' ? new Date() : undefined,
            slipDownloadUrl: nextStatus === 'Paid' ? buildSlipDownloadUrl(req, existing.propertyId, existing.id) : undefined,
            slipNote: nextStatus === 'Paid' ? 'Generated after successful SSLCommerz payment validation.' : undefined,
        },
    });

    return findPropertyAndPaymentByTransaction(transactionId);
};

// @desc    Handle SSL payment success callback
// @route   POST|GET /api/properties/payments/ssl/success
// @access  Public (gateway callback)
const handleSslPaymentSuccess = asyncHandler(async (req, res) => {
    const payload = getCallbackPayload(req);
    const transactionId = String(payload.tran_id || '').trim();
    const validationId = String(payload.val_id || '').trim();

    if (!transactionId) {
        return res.redirect(redirectToFrontend(req, '/dashboard', {
            paymentStatus: 'failed',
            message: 'Missing transaction reference from gateway.',
        }));
    }

    let validation = null;
    const runningInMock = !hasSslCredentials() || String(validationId).startsWith('MOCK-');

    if (runningInMock) {
        validation = {
            status: 'VALID',
            amount: payload.amount,
            currency: payload.currency || 'BDT',
            val_id: validationId || `MOCK-${Date.now()}`,
            bank_tran_id: payload.bank_tran_id || `BANK-${Date.now()}`,
            card_type: payload.card_type || 'SSL Mock Wallet',
            card_issuer: payload.card_issuer || 'Sandbox',
            card_brand: payload.card_brand || 'MOCK',
            card_sub_brand: payload.card_sub_brand || 'MOCK',
        };
    } else if (validationId) {
        try {
            validation = await validateSslPayment({ validationId, transactionId });
        } catch (error) {
            await finalizeSslPayment({ req, transactionId, nextStatus: 'Failed', payload });
            return res.redirect(redirectToFrontend(req, '/dashboard', {
                paymentStatus: 'failed',
                tranId: transactionId,
                message: 'Payment verification failed at SSL validation.',
            }));
        }
    }

    const verified = runningInMock || isSslValidationSuccessful(validation || payload);
    const result = await finalizeSslPayment({
        req,
        transactionId,
        nextStatus: verified ? 'Paid' : 'Failed',
        payload,
        validation,
    });

    if (!result?.property || !result?.payment) {
        return res.redirect(redirectToFrontend(req, '/dashboard', {
            paymentStatus: 'failed',
            tranId: transactionId,
            message: 'Payment found mismatch in local records.',
        }));
    }

    const path = `/properties/${result.property._id}`;
    return res.redirect(redirectToFrontend(req, path, {
        paymentStatus: verified ? 'success' : 'failed',
        paymentId: result.payment._id,
        tranId: transactionId,
    }));
});

// @desc    Handle SSL payment fail/cancel callback
// @route   POST|GET /api/properties/payments/ssl/fail|cancel
// @access  Public (gateway callback)
const handleSslPaymentFailure = asyncHandler(async (req, res) => {
    const payload = getCallbackPayload(req);
    const transactionId = String(payload.tran_id || '').trim();
    const isCancelled = String(req.path || '').includes('/cancel');

    if (transactionId) {
        const result = await finalizeSslPayment({
            req,
            transactionId,
            nextStatus: isCancelled ? 'Cancelled' : 'Failed',
            payload,
        });

        if (result?.property) {
            return res.redirect(redirectToFrontend(req, `/properties/${result.property._id}`, {
                paymentStatus: isCancelled ? 'cancelled' : 'failed',
                tranId: transactionId,
            }));
        }
    }

    return res.redirect(redirectToFrontend(req, '/dashboard', {
        paymentStatus: isCancelled ? 'cancelled' : 'failed',
        tranId: transactionId,
    }));
});

const buildSlipPayload = (property, payment) => ({
    slipId: payment.slip?.slipId || `SSL-SLIP-${payment.transactionId}`,
    generatedAt: payment.slip?.generatedAt || payment.paidAt || payment.updatedAt,
    note: payment.slip?.note || 'Auto-generated from SSLCommerz validated payment.',
    property: {
        id: property._id,
        title: property.title,
        area: property.area,
        address: property.address,
    },
    tenant: {
        id: payment.tenant?._id || payment.tenant,
        name: payment.tenant?.fullName || payment.tenant?.username || 'Tenant',
        email: payment.tenant?.email || '',
        phone: payment.tenant?.phoneNumber || '',
    },
    payment: {
        paymentId: payment._id,
        transactionId: payment.transactionId,
        month: payment.month,
        amount: payment.amount,
        provider: payment.provider,
        status: payment.status,
        paidAt: payment.paidAt,
        currency: payment.ssl?.currency || 'BDT',
        validationId: payment.ssl?.validationId || '',
        bankTransactionId: payment.ssl?.bankTransactionId || '',
        cardType: payment.ssl?.cardType || '',
        cardIssuer: payment.ssl?.cardIssuer || '',
        cardBrand: payment.ssl?.cardBrand || '',
        cardSubtype: payment.ssl?.cardSubtype || '',
    },
    assistant: payment.assistant || null,
});

const buildSlipQrPayload = (slip) => {
    return {
        type: 'ssl-payment-slip',
        slipId: slip.slipId,
        transactionId: slip.payment?.transactionId,
        validationId: slip.payment?.validationId,
        amount: slip.payment?.amount,
        currency: slip.payment?.currency,
        month: slip.payment?.month,
        status: slip.payment?.status,
        propertyId: slip.property?.id,
        paymentId: slip.payment?.paymentId,
        generatedAt: slip.generatedAt,
    };
};

const parseQrVerificationInput = (input = {}) => {
    if (typeof input.qrData === 'string' && input.qrData.trim()) {
        try {
            const parsed = JSON.parse(input.qrData);
            return { ...input, ...parsed };
        } catch (error) {
            return null;
        }
    }

    return input;
};

const findPaymentForVerification = async ({ propertyId, paymentId, transactionId }) => {
    const db = getDbClient();
    if (propertyId && paymentId) {
        const payment = await db.rentPayment.findFirst({
            where: {
                id: String(paymentId),
                propertyId: String(propertyId),
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
                property: {
                    include: {
                        landlord: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                email: true,
                                phoneNumber: true,
                                role: true,
                            },
                        },
                    },
                },
            },
        });

        if (!payment) return { property: null, payment: null };
        const property = mapDbProperty({ ...payment.property, rentPayments: [payment] });
        return { property, payment: property.rentPayments?.[0] || null };
    }

    if (transactionId) {
        const { property, payment } = await findPropertyAndPaymentByTransaction(String(transactionId));
        return { property, payment };
    }

    return { property: null, payment: null };
};

const validateSlipAccess = ({ property, payment, user }) => {
    const isTenantOwner = String(payment.tenant?._id || payment.tenant) === String(user._id);
    const isLandlordOwner = String(property.landlord) === String(user._id);
    const isAdmin = user.role === 'Admin';

    if (!isTenantOwner && !isLandlordOwner && !isAdmin) {
        return { ok: false, status: 403, message: 'You are not allowed to access this payment slip.' };
    }

    if (payment.status !== 'Paid') {
        return { ok: false, status: 400, message: 'Payment slip is available only for paid transactions.' };
    }

    return { ok: true };
};

// @desc    Get generated payment slip for tenant/landlord/admin
// @route   GET /api/properties/:id/payments/:paymentId/slip
// @access  Private
const getPaymentSlip = asyncHandler(async (req, res) => {
    const db = getDbClient();
    const paymentRow = await db.rentPayment.findFirst({
        where: {
            id: req.params.paymentId,
            propertyId: req.params.id,
        },
        include: {
            tenant: {
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                },
            },
            property: {
                include: {
                    landlord: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });

    const property = paymentRow ? mapDbProperty({ ...paymentRow.property, rentPayments: [paymentRow] }) : null;

    if (!property) {
        res.status(404);
        throw new Error('Property not found.');
    }

    const payment = property.rentPayments?.[0] || null;
    if (!payment) {
        res.status(404);
        throw new Error('Payment record not found.');
    }

    const access = validateSlipAccess({ property, payment, user: req.user });
    if (!access.ok) {
        res.status(access.status);
        throw new Error(access.message);
    }

    const slip = buildSlipPayload(property, payment);

    res.status(200).json({
        success: true,
        slip,
    });
});

// @desc    Download payment slip as PDF
// @route   GET /api/properties/:id/payments/:paymentId/slip/pdf
// @access  Private
const downloadPaymentSlipPdf = asyncHandler(async (req, res) => {
    const db = getDbClient();
    const paymentRow = await db.rentPayment.findFirst({
        where: {
            id: req.params.paymentId,
            propertyId: req.params.id,
        },
        include: {
            tenant: {
                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    phoneNumber: true,
                },
            },
            property: {
                include: {
                    landlord: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });

    const property = paymentRow ? mapDbProperty({ ...paymentRow.property, rentPayments: [paymentRow] }) : null;

    if (!property) {
        res.status(404);
        throw new Error('Property not found.');
    }

    const payment = property.rentPayments?.[0] || null;
    if (!payment) {
        res.status(404);
        throw new Error('Payment record not found.');
    }

    const access = validateSlipAccess({ property, payment, user: req.user });
    if (!access.ok) {
        res.status(access.status);
        throw new Error(access.message);
    }

    const slip = buildSlipPayload(property, payment);
    const fileName = `${String(slip.slipId || 'payment-slip').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    const qrPayload = buildSlipQrPayload(slip);
    let qrImageBuffer = null;

    try {
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 220,
        });
        const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        qrImageBuffer = Buffer.from(base64, 'base64');
    } catch (error) {
        qrImageBuffer = null;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(20).text('Payment Confirmation Slip', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#444').text('Auto-generated after SSLCommerz payment validation', { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown();

    if (qrImageBuffer) {
        const qrX = doc.page.width - 170;
        const qrY = 55;
        doc.image(qrImageBuffer, qrX, qrY, { width: 95, height: 95 });
        doc.fontSize(9).fillColor('#555').text('Scan to verify', qrX, qrY + 100, { width: 95, align: 'center' });
        doc.fillColor('#000');
    }

    doc.fontSize(12).text(`Slip ID: ${slip.slipId}`);
    doc.text(`Generated At: ${slip.generatedAt ? new Date(slip.generatedAt).toLocaleString() : 'N/A'}`);
    doc.moveDown();

    doc.fontSize(13).text('Property Details');
    doc.fontSize(11).text(`Title: ${slip.property.title || '-'}`);
    doc.text(`Area: ${slip.property.area || '-'}`);
    doc.text(`Address: ${slip.property.address || '-'}`);
    doc.moveDown();

    doc.fontSize(13).text('Tenant Details');
    doc.fontSize(11).text(`Name: ${slip.tenant.name || '-'}`);
    doc.text(`Email: ${slip.tenant.email || '-'}`);
    doc.text(`Phone: ${slip.tenant.phone || '-'}`);
    doc.moveDown();

    doc.fontSize(13).text('Payment Details');
    doc.fontSize(11).text(`Transaction ID: ${slip.payment.transactionId || '-'}`);
    doc.text(`Month: ${slip.payment.month || '-'}`);
    doc.text(`Amount: ${slip.payment.currency || 'BDT'} ${slip.payment.amount || 0}`);
    doc.text(`Provider: ${slip.payment.provider || '-'}`);
    doc.text(`Status: ${slip.payment.status || '-'}`);
    doc.text(`Paid At: ${slip.payment.paidAt ? new Date(slip.payment.paidAt).toLocaleString() : 'N/A'}`);
    doc.text(`Validation ID: ${slip.payment.validationId || '-'}`);
    doc.text(`Bank Transaction ID: ${slip.payment.bankTransactionId || '-'}`);
    doc.text(`Card Type: ${slip.payment.cardType || '-'}`);
    doc.text(`Card Issuer: ${slip.payment.cardIssuer || '-'}`);
    doc.moveDown();

    if (slip.assistant?.flags?.length > 0) {
        doc.fontSize(13).text('Smart Assistant Notes');
        doc.fontSize(11).text(`Status: ${slip.assistant.status || 'Needs Attention'}`);
        slip.assistant.flags.forEach((flag) => {
            doc.text(`- ${flag}`);
        });
        doc.moveDown();
    }

    doc.fontSize(10).fillColor('#444').text(slip.note || 'Generated from SSL verified transaction.');
    if (!qrImageBuffer) {
        doc.moveDown(0.4);
        doc.fontSize(9).text('QR could not be generated for this slip.', { align: 'left' });
    }
    doc.end();
});

// @desc    Verify QR slip payload against database record
// @route   POST /api/properties/payments/verify
// @access  Public
const verifyPaymentSlip = asyncHandler(async (req, res) => {
    const normalized = parseQrVerificationInput(req.body || {});

    if (!normalized) {
        return res.status(400).json({
            success: false,
            valid: false,
            code: 'INVALID_QR_DATA',
            message: 'QR data payload is not valid JSON.',
        });
    }

    const propertyId = normalized.propertyId || normalized.property?.id;
    const paymentId = normalized.paymentId || normalized.payment?.paymentId;
    const transactionId = normalized.transactionId || normalized.payment?.transactionId;

    if (!transactionId && !(propertyId && paymentId)) {
        return res.status(400).json({
            success: false,
            valid: false,
            code: 'INSUFFICIENT_DATA',
            message: 'Provide transactionId or propertyId + paymentId for verification.',
        });
    }

    const { property, payment } = await findPaymentForVerification({ propertyId, paymentId, transactionId });

    if (!property || !payment) {
        return res.status(200).json({
            success: true,
            valid: false,
            code: 'PAYMENT_NOT_FOUND',
            message: 'No payment record matched the provided data.',
        });
    }

    if (payment.status !== 'Paid') {
        return res.status(200).json({
            success: true,
            valid: false,
            code: 'PAYMENT_NOT_PAID',
            message: 'Payment exists but is not marked as paid.',
            verification: {
                propertyId: String(property._id),
                paymentId: String(payment._id),
                transactionId: payment.transactionId,
                status: payment.status,
            },
        });
    }

    const mismatch = [];
    if (normalized.slipId && payment.slip?.slipId && String(normalized.slipId) !== String(payment.slip.slipId)) {
        mismatch.push('slipId');
    }
    if (normalized.validationId && payment.ssl?.validationId && String(normalized.validationId) !== String(payment.ssl.validationId)) {
        mismatch.push('validationId');
    }
    if (normalized.currency && payment.ssl?.currency && String(normalized.currency).toUpperCase() !== String(payment.ssl.currency).toUpperCase()) {
        mismatch.push('currency');
    }
    if (normalized.month && String(normalized.month) !== String(payment.month)) {
        mismatch.push('month');
    }
    if (normalized.amount !== undefined && Number(normalized.amount) !== Number(payment.amount)) {
        mismatch.push('amount');
    }
    if (transactionId && String(transactionId) !== String(payment.transactionId)) {
        mismatch.push('transactionId');
    }

    if (mismatch.length > 0) {
        return res.status(200).json({
            success: true,
            valid: false,
            code: 'PAYLOAD_MISMATCH',
            message: 'Payment found but one or more fields do not match.',
            mismatch,
            verification: {
                propertyId: String(property._id),
                paymentId: String(payment._id),
                transactionId: payment.transactionId,
                status: payment.status,
            },
        });
    }

    return res.status(200).json({
        success: true,
        valid: true,
        code: 'VERIFIED',
        message: 'Payment slip is valid and verified.',
        verification: {
            propertyId: String(property._id),
            propertyTitle: property.title,
            paymentId: String(payment._id),
            transactionId: payment.transactionId,
            amount: payment.amount,
            currency: payment.ssl?.currency || 'BDT',
            month: payment.month,
            status: payment.status,
            paidAt: payment.paidAt,
            slipId: payment.slip?.slipId || `SSL-SLIP-${payment.transactionId}`,
        },
    });
});

// @desc    Send a chat message to the landlord or tenant
// @route   POST /api/properties/:id/messages
// @access  Private
const addMessage = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    const property = await db.property.findUnique({ where: { id: req.params.id } });

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const isTenant = req.user.role === 'Tenant';
    const isLandlordOwner = req.user.role === 'Landlord' && String(property.landlordId) === String(req.user._id);

    if (!isTenant && !isLandlordOwner) {
        res.status(403);
        throw new Error('Only tenant and landlord owners can chat on this listing.');
    }

    if (!req.body.message) {
        res.status(400);
        throw new Error('Message is required');
    }

    const moderation = analyzeTextForFraud(req.body.message, thresholds);
    if (moderation.riskLevel === 'High') {
        res.status(400);
        throw new Error('Message blocked by fraud/spam detection. Please rewrite your message.');
    }

    const createdMessage = await db.chatMessage.create({
        data: {
            propertyId: property.id,
            senderId: String(req.user._id),
            senderName: req.user.fullName || req.user.username || req.user.email,
            senderRole: req.user.role,
            message: req.body.message,
            moderationScore: moderation.score,
            moderationRiskLevel: moderation.riskLevel,
            moderationFlags: JSON.stringify(moderation.flags || []),
        },
    });

    const messageForClient = {
        _id: createdMessage.id,
        sender: String(req.user._id),
        senderName: createdMessage.senderName,
        senderRole: createdMessage.senderRole,
        message: createdMessage.message,
        moderation,
        createdAt: createdMessage.createdAt,
        updatedAt: createdMessage.updatedAt,
    };
    if (io) {
        io.to(`property:${property.id}`).emit('property:message', {
            propertyId: String(property.id),
            message: messageForClient,
        });
    }

    res.status(201).json({ success: true, message: 'Message sent.', createdMessage: messageForClient });
});

// @desc    Add or update a property review
// @route   POST /api/properties/:id/reviews
// @access  Private/Tenant
const addReview = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    const property = await db.property.findUnique({ where: { id: req.params.id } });

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only Tenant accounts can post reviews.');
    }

    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        res.status(400);
        throw new Error('Rating must be between 1 and 5.');
    }

    const hasApplication = await db.seatApplication.findFirst({
        where: {
            propertyId: property.id,
            tenantId: String(req.user._id),
        },
        select: { id: true },
    });

    if (!hasApplication) {
        res.status(403);
        throw new Error('You can review only properties where you requested or booked a seat.');
    }

    const moderation = analyzeTextForFraud(req.body.comment || '', thresholds);
    if (moderation.riskLevel === 'High') {
        res.status(400);
        throw new Error('Review blocked by fraud/spam detection. Please remove suspicious content.');
    }

    const existingReview = await db.review.findFirst({
        where: {
            propertyId: property.id,
            tenantId: String(req.user._id),
        },
    });

    if (existingReview) {
        await db.review.update({
            where: { id: existingReview.id },
            data: {
                rating,
                comment: req.body.comment || '',
                moderationScore: moderation.score,
                moderationRiskLevel: moderation.riskLevel,
                moderationFlags: JSON.stringify(moderation.flags || []),
            },
        });
    } else {
        await db.review.create({
            data: {
                propertyId: property.id,
                tenantId: String(req.user._id),
                tenantName: req.user.fullName || req.user.username || req.user.email,
                rating,
                comment: req.body.comment || '',
                moderationScore: moderation.score,
                moderationRiskLevel: moderation.riskLevel,
                moderationFlags: JSON.stringify(moderation.flags || []),
            },
        });
    }

    const reviews = await db.review.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: 'desc' } });

    res.status(201).json({
        success: true,
        message: 'Review submitted successfully.',
        reviews: reviews.map((review) => ({
            _id: review.id,
            tenant: review.tenantId,
            tenantName: review.tenantName,
            rating: review.rating,
            comment: review.comment,
            moderation: {
                score: review.moderationScore,
                riskLevel: review.moderationRiskLevel,
                flags: parseVerificationFlags(review.moderationFlags),
            },
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
        })),
    });
});

// @desc    Get landlord/admin rent tracker by month
// @route   GET /api/properties/mine/rent-tracker
// @access  Private/Landlord/Admin
const getRentTracker = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    if (!['Landlord', 'Admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Only landlord or admin can access rent tracker.');
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const where = req.user.role === 'Admin' ? {} : { landlordId: String(req.user._id) };

    const rows = await db.property.findMany({
        where,
        include: {
            seatApplications: {
                include: {
                    tenant: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                        },
                    },
                },
            },
            rentPayments: {
                include: {
                    tenant: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true,
                            email: true,
                            phoneNumber: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const properties = rows.map(mapDbProperty);

    const tracker = properties.map((property) => {
        const tenantMap = new Map();

        (property.seatApplications || [])
            .filter((application) => application.status === 'Approved')
            .forEach((application) => {
                const tenantId = String(application.tenant?._id || application.tenant);
                if (!tenantMap.has(tenantId)) {
                    tenantMap.set(tenantId, {
                        tenantId,
                        tenantName: application.tenantName,
                        tenantEmail: application.tenantEmail,
                        tenantPhone: application.tenantPhone,
                        seatsBooked: 0,
                    });
                }

                const existing = tenantMap.get(tenantId);
                existing.seatsBooked += Number(application.seatsRequested || 1);
            });

        const tenants = Array.from(tenantMap.values()).map((tenant) => {
            const payment = (property.rentPayments || []).find(
                (entry) => String(entry.tenant?._id || entry.tenant) === tenant.tenantId && entry.month === month
            );

            return {
                ...tenant,
                payment: payment
                    ? {
                        id: payment._id,
                        status: payment.status,
                        amount: payment.amount,
                        provider: payment.provider,
                        transactionId: payment.transactionId,
                        month: payment.month,
                      }
                    : null,
            };
        });

        return {
            propertyId: property._id,
            title: property.title,
            area: property.area,
            rentalMonth: property.rentalMonth || '',
            month,
            monthlyRentPerSeat: property.monthlyRentPerSeat,
            tenants,
            rentalRisk: computeRentalRisk({
                unpaidCount: tenants.filter((tenant) => !tenant.payment || tenant.payment.status !== 'Paid').length,
                rejectedCount: tenants.filter((tenant) => tenant.payment?.status === 'Rejected').length,
                pendingCount: tenants.filter((tenant) => tenant.payment?.status === 'Pending').length,
                occupancyRatio: Number(property.totalSeats || 0) > 0
                    ? (Number(property.totalSeats || 0) - Number(property.availableSeats || 0)) / Number(property.totalSeats || 1)
                    : 0,
            }, thresholds),
        };
    });

    res.status(200).json({ success: true, month, tracker });
});

// @desc    Update payment status
// @route   PATCH /api/properties/:id/payments/:paymentId
// @access  Private/Landlord/Admin
const updateRentPaymentStatus = asyncHandler(async (req, res) => {
    const db = getDbClient();
    const payment = await db.rentPayment.findFirst({
        where: {
            id: req.params.paymentId,
            propertyId: req.params.id,
        },
        include: {
            property: {
                select: {
                    id: true,
                    landlordId: true,
                },
            },
        },
    });

    if (!payment?.property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canManage = String(payment.property.landlordId) === String(req.user._id) || req.user.role === 'Admin';
    if (!canManage) {
        res.status(403);
        throw new Error('You are not allowed to manage this payment.');
    }

    const { status } = req.body;
    if (!['Pending', 'Paid', 'Rejected'].includes(status)) {
        res.status(400);
        throw new Error('Invalid payment status.');
    }

    const updatedPayment = await db.rentPayment.update({
        where: { id: payment.id },
        data: {
            status: toDbEnum(status),
            paidAt: status === 'Paid' ? new Date() : null,
        },
    });

    res.status(200).json({ success: true, message: `Payment marked as ${status}.`, payment: {
        _id: updatedPayment.id,
        status: fromDbEnum(updatedPayment.status),
        paidAt: updatedPayment.paidAt,
    } });
});

// @desc    Get tenant smart monthly reminders
// @route   GET /api/properties/tenant/reminders
// @access  Private/Tenant
const getTenantReminders = asyncHandler(async (req, res) => {
    const db = getDbClient();
    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only tenant accounts can access reminders.');
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const properties = await db.property.findMany({
        where: {
            seatApplications: {
                some: {
                    tenantId: String(req.user._id),
                    status: 'Approved',
                },
            },
        },
        include: {
            seatApplications: {
                where: {
                    tenantId: String(req.user._id),
                    status: 'Approved',
                },
            },
            rentPayments: {
                where: {
                    tenantId: String(req.user._id),
                    month,
                },
            },
        },
    });

    const mappedProperties = properties.map(mapDbProperty);

    const records = mappedProperties.map((property) => {
        const booking = (property.seatApplications || []).find(
            (application) => String(application.tenant) === String(req.user._id) && application.status === 'Approved'
        );

        const seatsBooked = Number(booking?.seatsRequested || 1);
        const payment = (property.rentPayments || []).find(
            (entry) => String(entry.tenant) === String(req.user._id) && entry.month === month
        );

        return {
            propertyId: property._id,
            title: property.title,
            month,
            amount: Number(property.monthlyRentPerSeat || 0) * seatsBooked,
            status: payment?.status || 'Unpaid',
        };
    });

    const reminderEngine = getTenantReminderSummary(records);
    res.status(200).json({ success: true, month, reminderEngine });
});

// @desc    Get landlord listing quality + risk + pricing assistant
// @route   GET /api/properties/mine/intelligence
// @access  Private/Landlord/Admin
const getLandlordIntelligence = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    if (!['Landlord', 'Admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Only landlord or admin can access listing intelligence.');
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const where = req.user.role === 'Admin' ? {} : { landlordId: String(req.user._id) };
    const rows = await db.property.findMany({
        where,
        include: {
            seatApplications: true,
            rentPayments: true,
        },
        orderBy: { createdAt: 'desc' },
    });
    const properties = rows.map(mapDbProperty);
    const rents = properties.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
    const marketMedianRent = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;

    const intelligence = properties.map((property) => {
        const approvedTenants = (property.seatApplications || []).filter((application) => application.status === 'Approved');
        const payments = (property.rentPayments || []).filter((payment) => payment.month === month);
        const unpaidCount = approvedTenants.filter((tenant) => !payments.some((payment) => String(payment.tenant) === String(tenant.tenant) && payment.status === 'Paid')).length;

        return {
            propertyId: property._id,
            title: property.title,
            area: property.area,
            listingQuality: scoreListingQuality(property, thresholds),
            commuteScore: computeCommuteScore(property),
            pricingRecommendation: recommendDynamicPrice(property, {
                marketMedian: marketMedianRent || Number(property.monthlyRentPerSeat || 0),
                occupancyRatio: Number(property.totalSeats || 0) > 0
                    ? (Number(property.totalSeats || 0) - Number(property.availableSeats || 0)) / Number(property.totalSeats || 1)
                    : 0,
                qualityScore: scoreListingQuality(property, thresholds).score,
                commuteScore: computeCommuteScore(property).score,
            }, thresholds),
            rentalRisk: computeRentalRisk({
                unpaidCount,
                rejectedCount: payments.filter((payment) => payment.status === 'Rejected').length,
                pendingCount: payments.filter((payment) => payment.status === 'Pending').length,
                occupancyRatio: Number(property.totalSeats || 0) > 0
                    ? (Number(property.totalSeats || 0) - Number(property.availableSeats || 0)) / Number(property.totalSeats || 1)
                    : 0,
            }, thresholds),
        };
    });

    res.status(200).json({ success: true, month, intelligence });
});

// @desc    Get listing quality assistant for one listing
// @route   GET /api/properties/:id/quality-assistant
// @access  Private/Landlord/Admin
const getListingQualityAssistant = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    const row = await db.property.findUnique({ where: { id: req.params.id } });
    const property = row ? mapDbProperty(row) : null;
    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canAccess = String(property.landlord?._id || property.landlord) === String(req.user._id) || req.user.role === 'Admin';
    if (!canAccess) {
        res.status(403);
        throw new Error('You are not allowed to access listing quality assistant for this listing.');
    }

    const quality = scoreListingQuality(property, thresholds);
    res.status(200).json({ success: true, propertyId: property._id, quality });
});

// @desc    Get pricing recommendation for one listing
// @route   GET /api/properties/:id/pricing-recommendation
// @access  Private/Landlord/Admin
const getPricingRecommendation = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const db = getDbClient();
    const row = await db.property.findUnique({ where: { id: req.params.id } });
    const property = row ? mapDbProperty(row) : null;
    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canAccess = String(property.landlord?._id || property.landlord) === String(req.user._id) || req.user.role === 'Admin';
    if (!canAccess) {
        res.status(403);
        throw new Error('You are not allowed to access pricing recommendation for this listing.');
    }

    const marketSample = await db.property.findMany({
        where: {
            area: { equals: String(property.area || ''), mode: 'insensitive' },
            publicationStatus: 'Approved',
            isActive: true,
        },
        select: { monthlyRentPerSeat: true },
    });

    const rents = marketSample.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
    const marketMedian = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : Number(property.monthlyRentPerSeat || 0);

    const recommendation = recommendDynamicPrice(property, {
        marketMedian,
        occupancyRatio: Number(property.totalSeats || 0) > 0
            ? (Number(property.totalSeats || 0) - Number(property.availableSeats || 0)) / Number(property.totalSeats || 1)
            : 0,
        qualityScore: scoreListingQuality(property.toObject(), thresholds).score,
        commuteScore: computeCommuteScore(property.toObject()).score,
    }, thresholds);

    res.status(200).json({ success: true, propertyId: property._id, recommendation });
});

// @desc    Get admin insights dashboard intelligence
// @route   GET /api/properties/admin/insights
// @access  Private/Admin
const getAdminInsights = asyncHandler(async (req, res) => {
    const db = getDbClient();
    const [users, properties] = await Promise.all([
        db.user.findMany({
            where: { role: { in: ['Tenant', 'Landlord'] } },
            select: {
                role: true,
                verificationStatus: true,
                createdAt: true,
            },
        }),
        db.property.findMany({
            select: {
                publicationStatus: true,
                totalSeats: true,
                availableSeats: true,
                messages: { select: { id: true } },
                reviews: { select: { id: true } },
                createdAt: true,
            },
        }),
    ]);

    const normalizedUsers = users.map((user) => ({
        ...user,
        role: fromDbEnum(user.role),
    }));

    const normalizedProperties = properties.map((property) => ({
        ...property,
        publicationStatus: fromDbEnum(property.publicationStatus),
    }));

    const insights = buildAdminInsights({ users: normalizedUsers, properties: normalizedProperties });
    res.status(200).json({ success: true, insights });
});

// @desc    Get admin-configurable intelligence thresholds
// @route   GET /api/properties/admin/intelligence-thresholds
// @access  Private/Admin
const getIntelligenceThresholds = asyncHandler(async (req, res) => {
    const defaults = getDefaultThresholds();
    const db = getDbClient();
    const settings = await db.intelligenceSettings.findUnique({ where: { key: 'global' } });
    const thresholds = resolveThresholds(settings?.thresholds || defaults);

    res.status(200).json({
        success: true,
        thresholds,
        source: settings ? 'database+env' : 'env',
        updatedAt: settings?.updatedAt || null,
    });
});

// @desc    Update admin-configurable intelligence thresholds
// @route   PATCH /api/properties/admin/intelligence-thresholds
// @access  Private/Admin
const updateIntelligenceThresholds = asyncHandler(async (req, res) => {
    const db = getDbClient();
    const sanitized = sanitizeThresholdInput(req.body?.thresholds || {});
    if (Object.keys(sanitized).length === 0) {
        res.status(400);
        throw new Error('No valid threshold values provided.');
    }

    const errors = validateThresholdPayload(sanitized);
    if (errors.length > 0) {
        res.status(400);
        throw new Error(errors.join(' '));
    }

    const existing = await db.intelligenceSettings.findUnique({ where: { key: 'global' } });
    const merged = resolveThresholds({
        ...(existing?.thresholds || {}),
        ...sanitized,
    });

    const nextDoc = await db.intelligenceSettings.upsert({
        where: { key: 'global' },
        create: {
            key: 'global',
            thresholds: merged,
            updatedById: String(req.user._id),
        },
        update: {
            thresholds: merged,
            updatedById: String(req.user._id),
        },
    });

    res.status(200).json({
        success: true,
        message: 'Intelligence thresholds updated successfully.',
        thresholds: resolveThresholds(nextDoc.thresholds),
        updatedAt: nextDoc.updatedAt,
    });
});

module.exports = {
    getProperties,
    getPropertyById,
    addProperty,
    getMyProperties,
    getPendingPublications,
    reviewPropertyPublication,
    updateProperty,
    applyForSeat,
    reviewApplication,
    initiateSslRentPayment,
    handleSslPaymentSuccess,
    handleSslPaymentFailure,
    addRentPayment,
    updateRentPaymentStatus,
    getPaymentSlip,
    downloadPaymentSlipPdf,
    verifyPaymentSlip,
    addMessage,
    addReview,
    getRentTracker,
    getTenantReminders,
    getLandlordIntelligence,
    getListingQualityAssistant,
    getPricingRecommendation,
    getAdminInsights,
    getIntelligenceThresholds,
    updateIntelligenceThresholds,
    setSocketServer,
};