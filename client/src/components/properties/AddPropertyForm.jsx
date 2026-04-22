// frontend/src/components/properties/AddPropertyForm.jsx
import React, { useState , useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // To get user token
import Button from '../common/Button/Button';
import styles from './AddPropertyForm.module.css'; 
import { toast } from 'react-toastify';

const AddPropertyForm = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth(); // Get user info and token for authenticated requests
    const [localPhotoPreviews, setLocalPhotoPreviews] = useState([]); // Stores { file, previewUrl } objects

    const [formData, setFormData] = useState({
        firstName: user?.firstName || '', // Pre-fill if user data is available
        lastName: user?.lastName || '',
        ownerContactNumber: user?.contactNumber || '',
        ownerAlternateContactNumber: '',
        locality: '',
        address: '',
        spaceType: '',
        petsAllowed: false,
        preference: '',
        bachelorsAllowed: 'Any',
        type: '', // Furnishing type
        bhk: '',
        floor: '',
        nearestLandmark: '',
        washroomType: '',
        coolingFacility: '',
        carParking: false,
        rent: '',
        maintenance: '',
        photos: [], // Will store actual URLs after upload
        squareFeetArea: '',
        appliances: [],
        amenities: [],
        aboutProperty: '',
        googleMapLocation: { latitude: '', longitude: '' } // For map
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [photoUploadLoading, setPhotoUploadLoading] = useState(false);

    // Effect to revoke object URLs when component unmounts or previews change
    useEffect(() => {
        return () => {
            localPhotoPreviews.forEach(preview => URL.revokeObjectURL(preview.previewUrl));
        };
    }, [localPhotoPreviews]);

    const appliancesOptions = ['Refrigerator', 'Washing Machine', 'Microwave', 'Oven', 'Dishwasher', 'TV', 'Water Purifier'];
    const amenitiesOptions = ['Gym', 'Swimming Pool', 'Clubhouse', 'Park', 'Security', 'Power Backup', 'Lift', 'Parking', '24/7 Water'];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Clear error for the specific field when it changes
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });

        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'bhk' || name === 'rent' || name === 'maintenance' || name === 'squareFeetArea') {
            setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleMultiSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // No direct error clearing for multi-select as it's typically valid
    };

    const handleGoogleMapChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            googleMapLocation: {
                ...prev.googleMapLocation,
                [name]: value === '' ? '' : Number(value) // Allow empty string for clearing input
            }
        }));
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) {
            toast.info('No files selected for upload.');
            return;
        }

        // Clear previous local previews to show only newly selected ones
        localPhotoPreviews.forEach(preview => URL.revokeObjectURL(preview.previewUrl)); // Clean up old previews
        setLocalPhotoPreviews([]);

        // Create local URLs for immediate preview
        const newLocalPreviews = files.map(file => ({
            file: file, // Keep the actual file object if needed later
            previewUrl: URL.createObjectURL(file) // Generate a temporary URL for browser display
        }));
        setLocalPhotoPreviews(newLocalPreviews); // Update local state for immediate preview

        setPhotoUploadLoading(true);
        setErrors(prev => ({ ...prev, photos: '' })); // Clear photo errors immediately when new files are selected

        // setPhotoUploadLoading(true);
        const uploadFormData = new FormData();
        files.forEach(file => {
            uploadFormData.append('photos', file); // 'photos' must match the field name in multer setup
        });

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data', // Important for file uploads
                    Authorization: `Bearer ${token}` // Still send token for auth if upload endpoint is protected
                }
            };
            // Send files to your new upload endpoint
            const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/upload`, uploadFormData, config);

            setFormData(prev => {
                const updatedPhotos = [...prev.photos, ...data.urls];
                // After adding new photos, clear any photo-related error if the count is now sufficient
                return { ...prev, photos: updatedPhotos };
            });

            toast.success('Photos uploaded successfully!');

            // IMPORTANT: Revoke object URLs once the actual backend URLs are available
            // to prevent memory leaks, but only if you plan to switch from local previews
            // to server-provided URLs for display. If you keep showing both, manage carefully.
            // For simplicity here, we'll clear local previews after successful upload.
            setLocalPhotoPreviews([]); // Clear local previews once actual URLs are obtained

        } catch (err) {
            console.error('Photo upload failed:', err);
            const errorMessage = err.response && err.response.data.message
                ? err.response.data.message
                : 'Failed to upload photos. Please check file types and size (max 5MB per file, images only).';
            toast.error(errorMessage);
            setErrors(prev => ({ ...prev, photos: errorMessage })); // Set error if upload fails
        } finally {
            setPhotoUploadLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        // Owner Details
        if (!formData.firstName) newErrors.firstName = 'First Name is required.';
        if (!formData.lastName) newErrors.lastName = 'Last Name is required.';
        if (!formData.ownerContactNumber) newErrors.ownerContactNumber = 'Contact Number is required.';
        // Property Location & Type
        if (!formData.locality) newErrors.locality = 'Locality is required.';
        if (!formData.address) newErrors.address = 'Address is required.';
        if (!formData.spaceType) newErrors.spaceType = 'Space Type is required.';
        // Preferences & Facilities
        if (!formData.preference) newErrors.preference = 'Preference is required.';
        // Rental Details
        if (!formData.rent || formData.rent <= 0) newErrors.rent = 'Rent must be a positive number.';
        if (!formData.type) newErrors.type = 'Furnishing Type is required.';
        if (!formData.squareFeetArea || formData.squareFeetArea <= 0) newErrors.squareFeetArea = 'Square Feet Area is required.';
        // Photos
        if (!formData.photos || formData.photos.length < 5) newErrors.photos = 'Minimum 5 photos are required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please correct the errors in the form.');
            return;
        }

        setLoading(true);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` // Send JWT token for authentication
                }
            };

            const dataToSend = {
                ...formData,
                rent: Number(formData.rent),
                maintenance: Number(formData.maintenance),
                bhk: formData.bhk !== '' ? Number(formData.bhk) : undefined,
                squareFeetArea: Number(formData.squareFeetArea),
            };

            // Remove bachelorsAllowed if preference is Family, or if preference is not selected
            if (formData.preference === 'Family' || !formData.preference) {
                delete dataToSend.bachelorsAllowed;
            }
            console.log('Auth Token:', token);
            const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/properties`, dataToSend, config);
            toast.success('Property added successfully!');
            console.log('Property added:', data);
            // Optionally redirect to property details page or listings
            setTimeout(() => navigate('/properties'), 2000);
        } catch (err) {
            console.error("Submission error:", err.response ? err.response.data : err); // Log full error
            toast.error(err.response && err.response.data.message
                ? err.response.data.message
                : 'Failed to add property. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine if a field is required (for asterisk)
    const isRequired = (fieldName) => {
        const requiredFields = [
            'firstName', 'lastName', 'ownerContactNumber', 'locality', 'address',
            'spaceType', 'rent', 'type', 'squareFeetArea', 'preference', 'photos'
        ];
        return requiredFields.includes(fieldName);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.addPropertyForm}>
            {/* Owner Details */}
            <h2 className={styles.formSectionTitle}>Owner Details</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="firstName">First Name {isRequired('firstName') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className={errors.firstName ? styles.inputError : ''} />
                    {errors.firstName && <span className={styles.errorText}>{errors.firstName}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="lastName">Last Name {isRequired('lastName') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className={errors.lastName ? styles.inputError : ''} />
                    {errors.lastName && <span className={styles.errorText}>{errors.lastName}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="ownerContactNumber">Owner's Contact Number  {isRequired('ownerContactNumber') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <input type="text" id="ownerContactNumber" name="ownerContactNumber" value={formData.ownerContactNumber} onChange={handleChange} className={errors.ownerContactNumber ? styles.inputError : ''} />
                    {errors.ownerContactNumber && <span className={styles.errorText}>{errors.ownerContactNumber}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="ownerAlternateContactNumber">Owner's Alternate Contact Number (Optional)</label>
                    <input type="text" id="ownerAlternateContactNumber" name="ownerAlternateContactNumber" value={formData.ownerAlternateContactNumber} onChange={handleChange} />
                </div>
            </div>

            {/* Property Location & Type */}
            <h2 className={styles.formSectionTitle}>Property Location & Type</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="locality">Locality {isRequired('locality') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <input type="text" id="locality" name="locality" value={formData.locality} onChange={handleChange} className={errors.locality ? styles.inputError : ''} />
                    {errors.locality && <span className={styles.errorText}>{errors.locality}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="address">Address {isRequired('address') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className={errors.address ? styles.inputError : ''} />
                    {errors.address && <span className={styles.errorText}>{errors.address}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="spaceType">Space Type {isRequired('spaceType') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <select id="spaceType" name="spaceType" value={formData.spaceType} onChange={handleChange} className={errors.spaceType ? styles.inputError : ''}>
                        <option value="">Select Space Type</option>
                        <option value="Flat">Flat</option>
                        <option value="House">House</option>
                        <option value="PG">PG</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="Office">Office</option>
                        <option value="Shop">Shop</option>
                    </select>
                    {errors.spaceType && <span className={styles.errorText}>{errors.spaceType}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="nearestLandmark">Nearest Landmark (Optional)</label>
                    <input type="text" id="nearestLandmark" name="nearestLandmark" value={formData.nearestLandmark} onChange={handleChange} />
                </div>
            </div>

            {/* Rental Details */}
            <h2 className={styles.formSectionTitle}>Rental Details</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="rent">Rent (₹) {isRequired('rent') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <input type="number" id="rent" name="rent" value={formData.rent} onChange={handleChange} className={errors.rent ? styles.inputError : ''} />
                    {errors.rent && <span className={styles.errorText}>{errors.rent}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="maintenance">Maintenance (₹) (Optional)</label>
                    <input type="number" id="maintenance" name="maintenance" value={formData.maintenance} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="type">Furnishing Type {isRequired('type') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <select id="type" name="type" value={formData.type} onChange={handleChange} className={errors.type ? styles.inputError : ''}>
                        <option value="">Select Furnishing Type</option>
                        <option value="Semi Furnished">Semi Furnished</option>
                        <option value="Fully Furnished">Fully Furnished</option>
                        <option value="Non Furnished">Non Furnished</option>
                    </select>
                    {errors.type && <span className={styles.errorText}>{errors.type}</span>}
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="bhk">BHK (1-5) (Optional)</label>
                    <select id="bhk" name="bhk" value={formData.bhk} onChange={handleChange}>
                        <option value="">Select BHK {isRequired('bhk') && <span className={styles.requiredIndicator}>*</span>}</option>
                        {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num} BHK</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="floor">Floor (Optional)</label>
                    <input type="text" id="floor" name="floor" value={formData.floor} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="squareFeetArea">Square Feet Area {isRequired('squareFeetArea') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <input type="number" id="squareFeetArea" name="squareFeetArea" value={formData.squareFeetArea} onChange={handleChange} className={errors.squareFeetArea ? styles.inputError : ''} />
                    {errors.squareFeetArea && <span className={styles.errorText}>{errors.squareFeetArea}</span>}
                </div>
            </div>

            {/* Preferences & Facilities */}
            <h2 className={styles.formSectionTitle}>Preferences & Facilities</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="preference">Preference {isRequired('preference') && <span className={styles.requiredIndicator}>*</span>}</label>
                    <select id="preference" name="preference" value={formData.preference} onChange={handleChange} className={errors.preference ? styles.inputError : ''}>
                        <option value="">Select Preference</option>
                        <option value="Family">Family</option>
                        <option value="Bachelors">Bachelors</option>
                        <option value="Any">Any</option>
                    </select>
                    {errors.preference && <span className={styles.errorText}>{errors.preference}</span>}
                </div>
                {(formData.preference === 'Bachelors' || formData.preference === 'Any') && (
                    <div className={styles.formGroup}>
                        <label htmlFor="bachelorsAllowed">Bachelors Allowed</label>
                        <select id="bachelorsAllowed" name="bachelorsAllowed" value={formData.bachelorsAllowed} onChange={handleChange}>
                            <option value="Any">Any</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                        </select>
                    </div>
                )}
                <div className={styles.formGroup}>
                    <label htmlFor="washroomType">Type of Washroom</label>
                    <select id="washroomType" name="washroomType" value={formData.washroomType} onChange={handleChange}>
                        <option value="">Select Type</option>
                        <option value="Western">Western</option>
                        <option value="Indian">Indian</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="coolingFacility">Cooling Facility</label>
                    <select id="coolingFacility" name="coolingFacility" value={formData.coolingFacility} onChange={handleChange}>
                        <option value="">Select Facility</option>
                        <option value="AC">AC</option>
                        <option value="Fan">Fan</option>
                        <option value="Both">Both</option>
                        <option value="None">None</option>
                    </select>
                </div>
                <div className={styles.checkboxGroup}>
                    <input type="checkbox" id="petsAllowed" name="petsAllowed" checked={formData.petsAllowed} onChange={handleChange} />
                    <label htmlFor="petsAllowed">Pets Allowed</label>
                </div>
                <div className={styles.checkboxGroup}>
                    <input type="checkbox" id="carParking" name="carParking" checked={formData.carParking} onChange={handleChange} />
                    <label htmlFor="carParking">Car Parking</label>
                </div>
            </div>

            {/* Appliances & Amenities */}
            <h2 className={styles.formSectionTitle}>Appliances & Amenities</h2>
            <div className={styles.formGroup}>
                <label>Appliances (Multi-select)</label>
                <div className={styles.checkboxGrid}>
                    {appliancesOptions.map(option => (
                        <div key={option} className={styles.checkboxItem}>
                            <input
                                type="checkbox"
                                id={`appliance-${option}`}
                                name="appliances"
                                value={option}
                                checked={formData.appliances.includes(option)}
                                onChange={(e) => {
                                    const { value, checked } = e.target;
                                    handleMultiSelectChange('appliances', checked
                                        ? [...formData.appliances, value]
                                        : formData.appliances.filter(item => item !== value)
                                    );
                                }}
                            />
                            <label htmlFor={`appliance-${option}`}>{option}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.formGroup}>
                <label>Amenities (Multi-select)</label>
                <div className={styles.checkboxGrid}>
                    {amenitiesOptions.map(option => (
                        <div key={option} className={styles.checkboxItem}>
                            <input
                                type="checkbox"
                                id={`amenity-${option}`}
                                name="amenities"
                                value={option}
                                checked={formData.amenities.includes(option)}
                                onChange={(e) => {
                                    const { value, checked } = e.target;
                                    handleMultiSelectChange('amenities', checked
                                        ? [...formData.amenities, value]
                                        : formData.amenities.filter(item => item !== value)
                                    );
                                }}
                            />
                            <label htmlFor={`amenity-${option}`}>{option}</label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Photos & About */}
            <h2 className={styles.formSectionTitle}>Photos & Description</h2>
            <div className={styles.formGroup}>
                <label htmlFor="photos">Photos hotos {isRequired('photos') && <span className={styles.requiredIndicator}>*</span>}(Minimum 5 photos)</label>
                <input
                    type="file"
                    id="photos"
                    name="photos"
                    multiple
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    // Apply inputError class based on errors.photos
                    className={`${styles.fileInput} ${errors.photos ? styles.inputError : ''}`} // Indicate loading/error for photo input
                    disabled={photoUploadLoading} // Disable input while uploading
                />
                {photoUploadLoading && <p className={styles.uploadingMessage}>Uploading photos...</p>}
                {errors.photos && <span className={styles.errorText}>{errors.photos}</span>}
                <div className={styles.thumbnailPreview}>
                    {/* Display uploaded photos (from backend) */}
                    {formData.photos.length > 0 && formData.photos.map((photoUrl, index) => (
                        <img key={`uploaded-${index}`} src={photoUrl} alt={`Property Photo ${index + 1}`} className={styles.thumbnail} />
                    ))}
                    {/* Display local previews for newly selected but not yet uploaded files
                    {localPhotoPreviews.map((preview, index) => (
                        <img
                            key={`local-${index}`}
                            src={preview.previewUrl}
                            alt={`Selected photo preview ${index + 1}`}
                            className={styles.thumbnail}
                        />
                    ))} */}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="aboutProperty">About the Property (Optional)</label>
                <textarea id="aboutProperty" name="aboutProperty" value={formData.aboutProperty} onChange={handleChange} rows="5"></textarea>
            </div>

            {/* Google Map Location */}
            <h2 className={styles.formSectionTitle}>Google Map Location (Optional)</h2>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="latitude">Latitude</label>
                    <input type="number" step="any" id="latitude" name="latitude" value={formData.googleMapLocation.latitude} onChange={handleGoogleMapChange} />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="longitude">Longitude</label>
                    <input type="number" step="any" id="longitude" name="longitude" value={formData.googleMapLocation.longitude} onChange={handleGoogleMapChange} />
                </div>
            </div>

            <Button type="submit" variant="primary" className={styles.submitButton} disabled={loading|| photoUploadLoading}>
                {loading ? 'Adding Property...' : 'Add Property'}
            </Button>
        </form>
    );
};

export default AddPropertyForm;