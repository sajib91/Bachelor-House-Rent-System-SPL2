// frontend/src/services/contactService.js
import api from './apiService'; // Import your configured Axios instance

const contactService = {
    /**
     * Submits a contact form to the backend.
     * @param {Object} formData - The data from the contact form.
     * @param {string} formData.name
     * @param {string} formData.email
     * @param {string} [formData.phone]
     * @param {string} formData.topic
     * @param {string} formData.message
     * @returns {Promise<Object>} The response data from the backend.
     */
    submitContactForm: async (formData) => {
            // The backend endpoint is /api/contact
            const response = await api.post('/contact', formData);
            return response.data;
        },
    };

export default contactService;