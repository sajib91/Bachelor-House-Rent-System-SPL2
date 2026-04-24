// backend/controllers/contactController.js
const sendEmail = require('../utils/emailService'); // Re-use the existing sendEmail utility
const getDbClient = require('../config/dbClient');

// @desc    Submit a contact form
// @route   POST /api/contact
// @access  Public
exports.submitContactForm = async (req, res, next) => {
    const { name, email, phone, topic, message } = req.body;
    const db = getDbClient();

    try {
        const contactEntry = await db.contact.create({
            data: {
            name,
            email,
            phone: phone || null,
            topic,
            message
            },
        });

        console.log('Contact message saved to DB with ID:', contactEntry.id); // Log for verification

        // Send confirmation email to the user
        const userEmailContent = `
            <h1>Thank you for contacting To-Let Globe!</h1>
            <p>We have received your message and will get back to you shortly.</p>
            <br>
            <h3>Your Details:</h3>
            <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Topic:</strong> ${topic}</li>
                <li><strong>Message:</strong> ${message}</li>
            </ul>
            <p>Please note: This is an automated confirmation.</p>
`;

        try {
            await sendEmail({
                email: email,
                subject: 'To-Let Globe: Your Contact Form Submission',
                html: userEmailContent
            });
            console.log('User confirmation email sent successfully.');
        } catch (err) {
            console.error('Error sending contact confirmation email:', err);
            // Don't block the user, just log the email error
            // You could also consider sending a generic success message even if email fails,
            // or a success message with a warning about email. For now, logging is fine.
        }
        // Send notification email to the admin
        if (process.env.ADMIN_EMAIL) {
            const adminEmailContent = `
                <p>A new contact form submission has been received on To-Let Globe:</p>
                <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
                    <li><strong>Topic:</strong> ${topic}</li>
                    <li><strong>Message:</strong> ${message}</li>
                    <li><strong>Message ID:</strong> ${contactEntry.id}</li>
                    <li><strong>Submitted At:</strong> ${contactEntry.createdAt.toLocaleString()}</li>
                </ul>
                <p>You can view this message in your admin panel once implemented.</p>
            `;
            try {
                await sendEmail({
                    email: process.env.ADMIN_EMAIL,
                    subject: `New To-Let Globe Contact: ${topic} from ${name}`,
                    html: adminEmailContent
                });
                console.log('Admin notification email sent successfully.');
            } catch (err) {
                console.error('Error sending admin contact notification email:', err);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Contact form submitted successfully!',
            contactId: contactEntry.id, // Include the ID for reference
        });

    } catch (error) {
        console.error('Error submitting contact form:', error);
        next(error); // Pass other errors to your centralized error handler
    }
};

// @desc    Get all contact messages for admin inbox
// @route   GET /api/contact/admin/messages
// @access  Private/Admin
exports.getAdminContactMessages = async (req, res, next) => {
    try {
        const db = getDbClient();
        const messages = await db.contact.findMany({
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            success: true,
            count: messages.length,
            messages,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update contact message status and admin note
// @route   PATCH /api/contact/admin/messages/:id
// @access  Private/Admin
exports.updateAdminContactMessage = async (req, res, next) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;
    const db = getDbClient();

    try {
        const message = await db.contact.findUnique({ where: { id } });

        if (!message) {
            return res.status(404).json({ success: false, message: 'Contact message not found.' });
        }

        const nextStatus = status || message.status;
        const updated = await db.contact.update({
            where: { id },
            data: {
                status: nextStatus,
                adminNote: typeof adminNote === 'string' ? adminNote.trim() : message.adminNote,
                resolvedAt: nextStatus === 'Resolved' ? new Date() : null,
                resolvedBy: nextStatus === 'Resolved' ? (req.user?.username || req.user?.email || 'admin') : null,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Contact message updated successfully.',
            contact: updated,
        });
    } catch (error) {
        next(error);
    }
};