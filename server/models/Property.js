// backend/models/Property.js

const mongoose = require('mongoose');

const seatApplicationSchema = new mongoose.Schema(
    {
        tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        tenantName: { type: String, required: true, trim: true },
        tenantEmail: { type: String, required: true, trim: true, lowercase: true },
        tenantPhone: { type: String, trim: true },
        studentIdType: { type: String, enum: ['Student ID', 'NID', 'Passport', 'Other'], default: 'Student ID' },
        seatsRequested: { type: Number, min: 1, default: 1 },
        documentUrl: { type: String, trim: true },
        roommateRequest: { type: Boolean, default: false },
        note: { type: String, trim: true },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        documentVerification: {
            score: { type: Number, min: 0, max: 100 },
            confidence: { type: String, trim: true },
            status: { type: String, trim: true },
            flags: [{ type: String, trim: true }],
        },
    },
    { timestamps: true }
);

const rentPaymentSchema = new mongoose.Schema(
    {
        tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        month: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
        provider: { type: String, enum: ['bKash', 'Nagad', 'Rocket', 'Other'], required: true },
        transactionId: { type: String, required: true, trim: true },
        status: { type: String, enum: ['Pending', 'Paid', 'Rejected'], default: 'Pending' },
        paidAt: { type: Date },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assistant: {
            status: { type: String, trim: true },
            flags: [{ type: String, trim: true }],
            expectedAmount: { type: Number, min: 0 },
            paidAmount: { type: Number, min: 0 },
        },
    },
    { timestamps: true }
);

const chatMessageSchema = new mongoose.Schema(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        senderName: { type: String, required: true, trim: true },
        senderRole: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true, maxlength: 1000 },
        moderation: {
            score: { type: Number, min: 0, max: 100 },
            riskLevel: { type: String, trim: true },
            flags: [{ type: String, trim: true }],
        },
    },
    { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
    {
        tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        tenantName: { type: String, required: true, trim: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true, maxlength: 1000 },
        moderation: {
            score: { type: Number, min: 0, max: 100 },
            riskLevel: { type: String, trim: true },
            flags: [{ type: String, trim: true }],
        },
    },
    { timestamps: true }
);

const PropertySchema = new mongoose.Schema(
    {
        landlord: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        landlordName: {
            type: String,
            required: true,
            trim: true,
        },
        landlordPhone: {
            type: String,
            trim: true,
        },
        landlordWhatsapp: {
            type: String,
            trim: true,
        },
        landlordBkash: {
            type: String,
            trim: true,
        },
        landlordNagad: {
            type: String,
            trim: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        area: {
            type: String,
            required: true,
            trim: true,
        },
        nearbyUniversity: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        mapLocation: {
            latitude: { type: Number },
            longitude: { type: Number },
            label: { type: String, trim: true },
            link: { type: String, trim: true },
        },
        totalSeats: {
            type: Number,
            required: true,
            min: 1,
        },
        availableSeats: {
            type: Number,
            required: true,
            min: 0,
        },
        genderPreference: {
            type: String,
            required: true,
            enum: ['Male', 'Female'],
        },
        roomType: {
            type: String,
            required: true,
            enum: ['Single Room', 'Shared Seat'],
        },
        monthlyRentPerSeat: {
            type: Number,
            required: true,
            min: 0,
        },
        securityDeposit: {
            type: Number,
            default: 0,
            min: 0,
        },
        mealSystem: {
            type: String,
            enum: ['Mill', 'Bua', 'Self', 'Mixed'],
            default: 'Mixed',
        },
        amenities: [{ type: String, trim: true }],
        rules: {
            gateClosingTime: { type: String, trim: true },
            guestPolicy: { type: String, trim: true },
            smokingRules: { type: String, trim: true },
            attachedBath: { type: Boolean, default: false },
            filteredWater: { type: Boolean, default: false },
            lift: { type: Boolean, default: false },
            wifi: { type: Boolean, default: false },
        },
        photos: [{ type: String, trim: true }],
        description: {
            type: String,
            trim: true,
        },
        universityProximity: {
            type: String,
            trim: true,
        },
        commuteMinutes: {
            type: Number,
            min: 0,
        },
        rentalMonth: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        publicationStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
        },
        seatApplications: [seatApplicationSchema],
        rentPayments: [rentPaymentSchema],
        messages: [chatMessageSchema],
        reviews: [reviewSchema],
        views: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Property', PropertySchema);