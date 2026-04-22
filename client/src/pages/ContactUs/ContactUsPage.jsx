// frontend/src/pages/ContactUs/ContactUsPage.jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import contactService from '../../services/contactService';

// Import InputField for consistent input styling
import InputField from '../../components/common/InputField/InputField';

// Import shared AuthPages styles for common input/button classes
// We still need these for individual elements like InputField, select, textarea, and buttons.
import authStyles from '../Auth/AuthPages.module.css';

// Import ContactUsPage's specific container and form wrapper styles
import contactStyles from './ContactUsPage.module.css'; // <--- NEW IMPORT

// Icons for input fields
import { FaUserAlt, FaEnvelope, FaPhone, FaTag, FaEdit } from 'react-icons/fa';

const ContactUsPage = () => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        try {
            await contactService.submitContactForm(data);
            toast.success('Your message has been sent successfully!');
            reset(); // Clear the form
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send message.');
        }
    };

    return (
        <div className={contactStyles['contact-us-container']}> {/* New wider page container */}
            <h1 className="main-heading">Contact Us</h1> {/* Using new heading style */}
            <p className="subheading">We'd love to hear from you!</p> {/* Using specific subheading style */}

            <div className={contactStyles['contact-form-wrapper']}> {/* New wrapper for the form and its gradient border */}
                <form onSubmit={handleSubmit(onSubmit)} className={authStyles.authForm}> {/* Reuse authForm for inner flex layout properties, or remove if contact-form-wrapper handles it fully */}
                    {/* Name Input */}
                    <InputField
                        id="name"
                        label="Name"
                        placeholder="Your Name"
                        icon={<FaUserAlt />}
                        error={errors.name?.message}
                        {...register('name', { required: 'Name is required' })}
                    />

                    {/* Email Input */}
                    <InputField
                        id="email"
                        type="email"
                        label="Email"
                        placeholder="Your Email Address"
                        icon={<FaEnvelope />}
                        error={errors.email?.message}
                        {...register('email', {
                            required: 'Email is required',
                            pattern: {
                                value: /^\S+@\S+\.\S+$/,
                                message: 'Invalid email address'
                            }
                        })}
                    />

                    {/* Phone Number Input */}
                    <InputField
                        id="phone"
                        type="text"
                        label="Phone Number (Optional)"
                        placeholder="Your Phone Number"
                        icon={<FaPhone />}
                        error={errors.phone?.message}
                        {...register('phone')}
                    />

                    {/* Topic Select */}
                    {/* Using a regular select for now as InputField is not built for selects,
                        but apply common styling classes from authStyles. */}
                    <div className={authStyles.inputGroup}> {/* Reusing inputGroup for icon positioning and spacing */}
                        <FaTag className={authStyles.inputIcon} /> {/* Icon for select */}
                        <select
                            id="topic"
                            className={`${authStyles.selectField} ${errors.topic ? authStyles.inputError : ''}`}
                            {...register('topic', { required: 'Please select a topic' })}
                        >
                            <option value="">Select a topic</option>
                            <option value="General Inquiry">General Inquiry</option>
                            <option value="Technical Support">Technical Support</option>
                            <option value="Partnership">Partnership</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors.topic && <p className={authStyles.errorMessage}>{errors.topic.message}</p>}
                    </div>

                    {/* Query/Message Textarea */}
                    {/* InputField component would need modification to support textarea,
                        so using regular textarea with common styling classes for now. */}
                    <div className={authStyles.inputGroup}> {/* Reusing inputGroup */}
                        <FaEdit className={authStyles.inputIcon} style={{ top: '20px', transform: 'translateY(0)' }}/> {/* Adjust icon position for textarea */}
                        <textarea
                            id="message"
                            rows="5"
                            placeholder="Your Message"
                            className={`${authStyles.inputField} ${authStyles.inputWithIcon} ${errors.message ? authStyles.inputError : ''}`}
                            {...register('message', {
                                required: 'Message is required',
                                maxLength: {
                                    value: 500,
                                    message: 'Message cannot exceed 500 characters'
                                }
                            })}
                        ></textarea>
                        {errors.message && <p className={authStyles.errorMessage}>{errors.message.message}</p>}
                    </div>

                    {/* Send Message Button */}
                    <button type="submit" className={authStyles.submitButtonFullWidth}>
                        Send Message
                    </button>

                    {/* Privacy Statement - using the new specific style */}
                    <p className={contactStyles.privacyStatement}>
                        We respect your privacy and will never share your data with third parties without your consent.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ContactUsPage;