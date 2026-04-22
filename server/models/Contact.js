// backend/models/Contact.js
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email address']
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    topic: {
        type: String,
        required: true,
        enum: ['General Inquiry', 'Technical Support', 'Partnership', 'Other']
    },
    message: {
        type: String,
        required: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    }
},  {
    timestamps: true
});

module.exports = mongoose.model('Contact', ContactSchema);