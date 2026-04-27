// backend/controllers/propertyController.js

const Property = require('../models/Property');
const User = require('../models/User');
const IntelligenceSettings = require('../models/IntelligenceSettings');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
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

let io = null;

const setSocketServer = (socketServer) => {
    io = socketServer;
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

const DUMMY_LISTING_KEYWORDS = [
    'dummy',
    'temp',
    'temporary',
    'test',
    'sample',
    'demo',
    'mock',
    'placeholder',
    'lorem',
    'asdf',
    'qwerty',
    'abc123',
];

const isLikelyDummyListing = (property = {}) => {
    const textBlob = [
        property.title,
        property.description,
        property.area,
        property.address,
        property.landlordName,
    ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

    const hasKeyword = DUMMY_LISTING_KEYWORDS.some((keyword) => textBlob.includes(keyword));
    const hasTooShortTitle = String(property.title || '').trim().length > 0 && String(property.title || '').trim().length < 6;
    const hasNoPhotos = !Array.isArray(property.photos) || property.photos.length === 0;
    const hasZeroOrInvalidRent = Number(property.monthlyRentPerSeat || 0) <= 0;

    let score = 0;
    if (hasKeyword) score += 2;
    if (hasTooShortTitle) score += 1;
    if (hasNoPhotos) score += 1;
    if (hasZeroOrInvalidRent) score += 1;

    return score >= 2;
};

const isPaymentCompletedStatus = (status = '') => ['Paid', 'Complete'].includes(String(status));

const getRuntimeThresholds = async () => {
    const defaults = getDefaultThresholds();
    const settings = await IntelligenceSettings.findOne({ key: 'global' });
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

    try {
        property = await Property.findById(req.params.id);
    } catch (dbError) {
        res.status(400);
        throw new Error(`Invalid property ID format: ${req.params.id}`);
    }

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const isPubliclyVisible = property.publicationStatus === 'Approved' && property.isActive !== false;
    const isOwnerOrAdmin = req.user && (req.user.role === 'Admin' || String(property.landlord) === String(req.user._id));

    if (!isPubliclyVisible && !isOwnerOrAdmin) {
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

    if (req.user.role !== 'Landlord') {
        res.status(403);
        throw new Error('Only registered landlord accounts can publish seat listings.');
    }

    if (req.user.verificationType !== 'NID') {
        res.status(403);
        throw new Error('Landlord accounts must be registered with NID verification.');
    }

    if (req.user.verificationStatus !== 'Verified') {
        res.status(403);
        throw new Error('Landlord account verification is pending. Please wait for admin approval.');
    }

    if (!Array.isArray(photos) || photos.length === 0) {
        res.status(400);
        throw new Error('Please upload at least one room image.');
    }

    const landlordName = req.user.fullName || req.user.username || req.user.email;

    const newProperty = new Property({
        landlord: req.user._id,
        landlordName,
        landlordPhone: req.user.phoneNumber,
        landlordWhatsapp: landlordWhatsapp || req.user.phoneNumber,
        landlordBkash,
        landlordNagad,
        rentalMonth,
        title,
        area,
        nearbyUniversity,
        address,
        mapLocation,
        totalSeats: Number(totalSeats),
        availableSeats: Number(availableSeats ?? totalSeats),
        genderPreference,
        roomType,
        monthlyRentPerSeat: Number(monthlyRentPerSeat),
        securityDeposit: Number(securityDeposit || 0),
        mealSystem: mealSystem || 'Mixed',
        amenities: normalizeAmenities(amenities),
        rules: normalizeRules(rules),
        photos,
        description,
        universityProximity,
        commuteMinutes,
        publicationStatus: 'Pending',
    });

    const createdProperty = await newProperty.save();
    const quality = scoreListingQuality(createdProperty.toObject(), thresholds);

    res.status(201).json({
        ...createdProperty.toObject(),
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
    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canEdit = req.user.role === 'Landlord' && String(property.landlord) === String(req.user._id);
    if (!canEdit) {
        res.status(403);
        throw new Error('Only the landlord owner can update this listing.');
    }

    const fieldsToUpdate = [
        'title',
        'area',
        'nearbyUniversity',
        'address',
        'mapLocation',
        'totalSeats',
        'availableSeats',
        'genderPreference',
        'roomType',
        'monthlyRentPerSeat',
        'securityDeposit',
        'mealSystem',
        'description',
        'universityProximity',
        'commuteMinutes',
        'isActive',
        'landlordWhatsapp',
        'landlordBkash',
        'landlordNagad',
        'rentalMonth',
    ];

    fieldsToUpdate.forEach((field) => {
        if (req.body[field] !== undefined) {
            property[field] = req.body[field];
        }
    });

    if (req.body.amenities !== undefined) {
        property.amenities = normalizeAmenities(req.body.amenities);
    }

    if (req.body.rules !== undefined) {
        property.rules = normalizeRules(req.body.rules);
    }

    if (req.body.photos !== undefined && Array.isArray(req.body.photos)) {
        property.photos = req.body.photos;
    }

    const updatedProperty = await property.save();
    res.json(updatedProperty);
});

// @desc    Delete a seat listing (landlord owner only)
// @route   DELETE /api/properties/:id
// @access  Private/Landlord
const deleteProperty = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canDelete = req.user.role === 'Landlord' && String(property.landlord) === String(req.user._id);
    if (!canDelete) {
        res.status(403);
        throw new Error('Only the landlord owner can delete this listing.');
    }

    await Property.deleteById(property._id);

    res.status(200).json({
        success: true,
        message: 'Listing deleted successfully.',
    });
});

// @desc    Remove a landlord listing with mandatory feedback (admin moderation)
// @route   PATCH /api/properties/admin/:id/remove
// @access  Private/Admin
const adminRemoveProperty = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const feedback = String(req.body?.feedback || '').trim();
    if (feedback.length < 5) {
        res.status(400);
        throw new Error('Feedback is required and must be at least 5 characters long.');
    }

    property.isActive = false;
    property.publicationStatus = 'Rejected';
    property.messages = property.messages || [];
    property.messages.push({
        sender: req.user._id,
        senderName: req.user.fullName || req.user.username || 'System Admin',
        senderRole: 'Admin',
        message: `Listing removed by admin. Feedback: ${feedback}`,
        moderation: { score: 0, riskLevel: 'Low', flags: [] },
        meta: {
            type: 'ADMIN_REMOVAL_FEEDBACK',
            removedAt: new Date().toISOString(),
            feedback,
        },
    });

    await property.save();

    res.status(200).json({
        success: true,
        message: 'Listing removed and feedback saved successfully.',
        property,
    });
});

// @desc    Bulk remove dummy/temp listings (admin moderation)
// @route   PATCH /api/properties/admin/cleanup-dummy
// @access  Private/Admin
const cleanupDummyListings = asyncHandler(async (req, res) => {
    const properties = await Property.find({ isActive: true });
    const removed = [];

    for (const property of properties) {
        if (!isLikelyDummyListing(property)) {
            continue;
        }

        property.isActive = false;
        property.publicationStatus = 'Rejected';
        property.messages = property.messages || [];
        property.messages.push({
            sender: req.user._id,
            senderName: req.user.fullName || req.user.username || 'System Admin',
            senderRole: 'Admin',
            message: 'Listing removed by admin cleanup because it looked like dummy or temporary content.',
            moderation: { score: 0, riskLevel: 'Low', flags: ['DUMMY_LISTING_CLEANUP'] },
            meta: {
                type: 'ADMIN_DUMMY_CLEANUP',
                removedAt: new Date().toISOString(),
            },
        });

        await property.save();
        removed.push({
            id: property._id,
            title: property.title,
        });
    }

    res.status(200).json({
        success: true,
        message: removed.length > 0
            ? `${removed.length} dummy/temp listing(s) removed successfully.`
            : 'No dummy/temp listings found to remove.',
        removedCount: removed.length,
        removed,
    });
});

// @desc    Apply for a seat
// @route   POST /api/properties/:id/apply
// @access  Private
const applyForSeat = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    if (property.publicationStatus !== 'Approved' || property.isActive === false) {
        res.status(403);
        throw new Error('This property is not available for seat applications.');
    }

    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only Tenant accounts can apply for seats.');
    }

    if (req.user.verificationStatus !== 'Verified') {
        res.status(403);
        throw new Error('Only verified registered tenants can apply for seats.');
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
        appliedAt: new Date().toISOString(),
        roommateRequest: Boolean(req.body.roommateRequest),
        note: req.body.note || '',
    });

    await property.save();

    if (io && property.landlord) {
        io.to(`user:${String(property.landlord)}`).emit('seat:application:new', {
            propertyId: String(property._id),
            propertyTitle: property.title,
            tenantName: req.user.fullName || req.user.username || req.user.email,
            seatsRequested,
            appliedAt: new Date().toISOString(),
        });
    }

    res.status(201).json({ success: true, message: 'Seat request submitted successfully.' });
});

// @desc    Approve or reject a seat request
// @route   PATCH /api/properties/:id/applications/:applicationId
// @access  Private/Landlord
const reviewApplication = asyncHandler(async (req, res) => {
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

    const canReview = String(property.landlord) === String(req.user._id) || req.user.role === 'Admin';
    if (!canReview) {
        res.status(403);
        throw new Error('You are not allowed to review this application');
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

// @desc    Submit rent payment
// @route   POST /api/properties/:id/payments
// @access  Private
const addRentPayment = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only Tenant accounts can submit rent payments.');
    }

    const approvedApplication = property.seatApplications.find(
        (application) => String(application.tenant) === String(req.user._id) && application.status === 'Approved'
    );

    if (!approvedApplication) {
        res.status(403);
        throw new Error('You must have an approved seat request before submitting rent payment.');
    }

    const provider = String(req.body.provider || '').trim();
    const mobileAccountNo = String(req.body.mobileAccountNo || '').trim();
    const otp = String(req.body.otp || '').trim();
    const pin = String(req.body.pin || '').trim();
    const paymentSlipUrl = String(req.body.paymentSlipUrl || '').trim();
    const paymentSlipQrInput = String(req.body.paymentSlipQr || '').trim();
    const month = String(req.body.month || '').trim();
    const generatedTransactionId = `SEC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const transactionId = String(req.body.transactionId || generatedTransactionId).trim();

    const generatedQrCode = paymentSlipQrInput || `QR-${crypto
        .createHash('sha256')
        .update(`${transactionId}|${mobileAccountNo}|${month}|${req.user._id}`)
        .digest('hex')
        .slice(0, 12)
        .toUpperCase()}`;

    const payment = {
        tenant: req.user._id,
        month,
        amount: Number(req.body.amount || property.monthlyRentPerSeat),
        provider,
        transactionId,
        mobileAccountNo,
        paymentSlipUrl,
        paymentSlipQr: generatedQrCode,
        otpHash: crypto.createHash('sha256').update(otp).digest('hex'),
        pinHash: crypto.createHash('sha256').update(pin).digest('hex'),
        securePayment: {
            sslMode: true,
            protocol: 'TLS',
            verifiedAt: new Date().toISOString(),
            qrAuthenticated: Boolean(generatedQrCode),
        },
        status: 'Complete',
        completedAt: new Date().toISOString(),
    };

    if (!payment.month || !payment.provider || !payment.transactionId) {
        res.status(400);
        throw new Error('Month, provider, and transaction ID are required');
    }

    if (!payment.mobileAccountNo || payment.mobileAccountNo.length < 10) {
        res.status(400);
        throw new Error('A valid mobile account number is required.');
    }

    if (!otp || otp.length < 4) {
        res.status(400);
        throw new Error('OTP verification is required.');
    }

    if (!pin || pin.length < 4) {
        res.status(400);
        throw new Error('PIN verification is required.');
    }

    const existingPayment = property.rentPayments.find(
        (entry) => String(entry.tenant) === String(req.user._id) && entry.month === payment.month && entry.status !== 'Rejected'
    );

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

    payment.assistant = paymentAssistant;

    property.rentPayments.push(payment);
    await property.save();

    res.status(201).json({
        success: true,
        message: 'Rent payment completed successfully.',
        paymentAssistant,
        paymentReceipt: {
            receiptId: `REC-${Date.now()}-${String(req.user._id).slice(-4)}`,
            status: payment.status,
            completedAt: payment.completedAt,
            provider: payment.provider,
            month: payment.month,
            amount: payment.amount,
            transactionId: payment.transactionId,
            paymentSlipUrl: payment.paymentSlipUrl,
            paymentSlipQr: payment.paymentSlipQr,
        },
    });
});

// @desc    Send a chat message to the landlord or tenant
// @route   POST /api/properties/:id/messages
// @access  Private
const addMessage = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const isTenant = req.user.role === 'Tenant';
    const isLandlordOwner = req.user.role === 'Landlord' && String(property.landlord) === String(req.user._id);

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

    const messagePayload = {
        sender: req.user._id,
        senderName: req.user.fullName || req.user.username || req.user.email,
        senderRole: req.user.role,
        message: req.body.message,
        moderation,
    };

    property.messages.push(messagePayload);

    await property.save();

    const createdMessage = property.messages[property.messages.length - 1];
    if (io) {
        io.to(`property:${property._id}`).emit('property:message', {
            propertyId: String(property._id),
            message: createdMessage,
        });
    }

    res.status(201).json({ success: true, message: 'Message sent.', createdMessage });
});

// @desc    Add or update a property review
// @route   POST /api/properties/:id/reviews
// @access  Private/Tenant
const addReview = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const property = await Property.findById(req.params.id);

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

    const hasApplication = property.seatApplications.some(
        (application) => String(application.tenant) === String(req.user._id)
    );

    if (!hasApplication) {
        res.status(403);
        throw new Error('You can review only properties where you requested or booked a seat.');
    }

    const moderation = analyzeTextForFraud(req.body.comment || '', thresholds);
    if (moderation.riskLevel === 'High') {
        res.status(400);
        throw new Error('Review blocked by fraud/spam detection. Please remove suspicious content.');
    }

    const existingReview = property.reviews.find(
        (review) => String(review.tenant) === String(req.user._id)
    );

    if (existingReview) {
        existingReview.rating = rating;
        existingReview.comment = req.body.comment || '';
        existingReview.moderation = moderation;
    } else {
        property.reviews.push({
            tenant: req.user._id,
            tenantName: req.user.fullName || req.user.username || req.user.email,
            rating,
            comment: req.body.comment || '',
            moderation,
        });
    }

    await property.save();

    res.status(201).json({ success: true, message: 'Review submitted successfully.', reviews: property.reviews });
});

// @desc    Get landlord/admin rent tracker by month
// @route   GET /api/properties/mine/rent-tracker
// @access  Private/Landlord/Admin
const getRentTracker = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    if (!['Landlord', 'Admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Only landlord or admin can access rent tracker.');
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const query = req.user.role === 'Admin' ? {} : { landlord: req.user._id };

    const properties = await Property.find(query)
        .populate('seatApplications.tenant', 'fullName username email phoneNumber')
        .populate('rentPayments.tenant', 'fullName username email phoneNumber')
        .sort({ createdAt: -1 });

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
                unpaidCount: tenants.filter((tenant) => !tenant.payment || !isPaymentCompletedStatus(tenant.payment.status)).length,
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
    const property = await Property.findById(req.params.id);

    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canManage = String(property.landlord) === String(req.user._id) || req.user.role === 'Admin';
    if (!canManage) {
        res.status(403);
        throw new Error('You are not allowed to manage this payment.');
    }

    const payment = property.rentPayments.id(req.params.paymentId);
    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }

    const { status } = req.body;
    if (!['Pending', 'Paid', 'Complete', 'Rejected'].includes(status)) {
        res.status(400);
        throw new Error('Invalid payment status.');
    }

    payment.status = status;
    if (isPaymentCompletedStatus(status)) {
        payment.paidAt = new Date();
        payment.completedAt = new Date();
    }

    await property.save();

    res.status(200).json({ success: true, message: `Payment marked as ${status}.`, payment });
});

// @desc    Get tenant smart monthly reminders
// @route   GET /api/properties/tenant/reminders
// @access  Private/Tenant
const getTenantReminders = asyncHandler(async (req, res) => {
    if (req.user.role !== 'Tenant') {
        res.status(403);
        throw new Error('Only tenant accounts can access reminders.');
    }

    const requestedMonth = String(req.query.month || '').trim();
    const fallbackMonth = new Date().toISOString().slice(0, 7);
    const properties = await Property.find({
        seatApplications: {
            $elemMatch: { tenant: req.user._id, status: 'Approved' },
        },
    }).select('title monthlyRentPerSeat rentalMonth seatApplications rentPayments');

    const records = properties.map((property) => {
        const booking = (property.seatApplications || []).find(
            (application) => String(application.tenant) === String(req.user._id) && application.status === 'Approved'
        );

        const dueMonth = requestedMonth || String(property.rentalMonth || '').trim() || fallbackMonth;

        const seatsBooked = Number(booking?.seatsRequested || 1);
        const payment = (property.rentPayments || []).find(
            (entry) => String(entry.tenant) === String(req.user._id) && entry.month === dueMonth
        );

        return {
            propertyId: property._id,
            title: property.title,
            month: dueMonth,
            amount: Number(property.monthlyRentPerSeat || 0) * seatsBooked,
            status: payment?.status || 'Unpaid',
        };
    });

    const reminderEngine = getTenantReminderSummary(records);
    res.status(200).json({ success: true, month: requestedMonth || fallbackMonth, reminderEngine });
});

// @desc    Get landlord listing quality + risk + pricing assistant
// @route   GET /api/properties/mine/intelligence
// @access  Private/Landlord/Admin
const getLandlordIntelligence = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    if (!['Landlord', 'Admin'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Only landlord or admin can access listing intelligence.');
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const query = req.user.role === 'Admin' ? {} : { landlord: req.user._id };
    const properties = await Property.find(query).sort({ createdAt: -1 });
    const rents = properties.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
    const marketMedianRent = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;

    const intelligence = properties.map((propertyDoc) => {
        const property = propertyDoc.toObject();
        const approvedTenants = (property.seatApplications || []).filter((application) => application.status === 'Approved');
        const payments = (property.rentPayments || []).filter((payment) => payment.month === month);
        const unpaidCount = approvedTenants.filter((tenant) => !payments.some((payment) => String(payment.tenant) === String(tenant.tenant) && isPaymentCompletedStatus(payment.status))).length;

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
    const property = await Property.findById(req.params.id);
    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canAccess = String(property.landlord) === String(req.user._id) || req.user.role === 'Admin';
    if (!canAccess) {
        res.status(403);
        throw new Error('You are not allowed to access listing quality assistant for this listing.');
    }

    const quality = scoreListingQuality(property.toObject(), thresholds);
    res.status(200).json({ success: true, propertyId: property._id, quality });
});

// @desc    Get pricing recommendation for one listing
// @route   GET /api/properties/:id/pricing-recommendation
// @access  Private/Landlord/Admin
const getPricingRecommendation = asyncHandler(async (req, res) => {
    const thresholds = await getRuntimeThresholds();
    const property = await Property.findById(req.params.id);
    if (!property) {
        res.status(404);
        throw new Error('Property not found');
    }

    const canAccess = String(property.landlord) === String(req.user._id) || req.user.role === 'Admin';
    if (!canAccess) {
        res.status(403);
        throw new Error('You are not allowed to access pricing recommendation for this listing.');
    }

    const marketSample = await Property.find({
        area: { $regex: `^${String(property.area || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        publicationStatus: 'Approved',
        isActive: true,
    }).select('monthlyRentPerSeat');

    const rents = marketSample.map((entry) => Number(entry.monthlyRentPerSeat || 0)).filter((value) => value > 0);
    const marketMedian = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : Number(property.monthlyRentPerSeat || 0);

    const recommendation = recommendDynamicPrice(property.toObject(), {
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
    const [users, properties] = await Promise.all([
        User.find({ role: { $in: ['Tenant', 'Landlord'] } }).select('role verificationStatus createdAt'),
        Property.find({}).select('publicationStatus totalSeats availableSeats messages reviews createdAt'),
    ]);

    const insights = buildAdminInsights({ users, properties });
    res.status(200).json({ success: true, insights });
});

// @desc    Get admin-configurable intelligence thresholds
// @route   GET /api/properties/admin/intelligence-thresholds
// @access  Private/Admin
const getIntelligenceThresholds = asyncHandler(async (req, res) => {
    const defaults = getDefaultThresholds();
    const settings = await IntelligenceSettings.findOne({ key: 'global' });
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

    const existing = await IntelligenceSettings.findOne({ key: 'global' });
    const merged = resolveThresholds({
        ...(existing?.thresholds || {}),
        ...sanitized,
    });

    const nextDoc = await IntelligenceSettings.upsertByKey('global', {
        thresholds: merged,
        updatedBy: req.user._id,
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
    adminRemoveProperty,
    cleanupDummyListings,
    updateProperty,
    deleteProperty,
    applyForSeat,
    reviewApplication,
    addRentPayment,
    updateRentPaymentStatus,
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