import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const AddPropertyPage = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [form, setForm] = useState(initialFormState);

  const uploadPhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadForm = new FormData();
      files.forEach((file) => uploadForm.append('photos', file));
      const response = await axios.post(`${API_BASE_URL}/upload`, uploadForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls = response.data.urls || [];
      setPhotoUrls((previous) => [...previous, ...urls]);
      toast.success('Photos uploaded successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload photos.');
    } finally {
      setUploading(false);
    }
  };

  const updateField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const toggleAmenity = (amenity) => {
    setForm((previous) => ({
      ...previous,
      amenities: previous.amenities.includes(amenity)
        ? previous.amenities.filter((item) => item !== amenity)
        : [...previous.amenities, amenity],
    }));
  };

  const updateRule = (name, value) => {
    setForm((previous) => ({
      ...previous,
      rules: { ...previous.rules, [name]: value },
    }));
  };

  const submitListing = async (event) => {
    event.preventDefault();

    if (photoUrls.length === 0) {
      toast.error('Upload at least one listing photo.');
      return;
    }

    setLoading(true);
    try {
      const mapLocationInput = form.mapLabel.trim();
      const mapLocation = mapLocationInput
        ? {
            label: mapLocationInput,
            link: mapLocationInput.startsWith('http') ? mapLocationInput : '',
          }
        : undefined;

      await apiClient.post('/properties', {
        ...form,
        photos: photoUrls,
        totalSeats: Number(form.totalSeats),
        availableSeats: Number(form.availableSeats || form.totalSeats),
        monthlyRentPerSeat: Number(form.monthlyRentPerSeat),
        securityDeposit: Number(form.securityDeposit || 0),
        mapLocation,
        landlordWhatsapp: form.landlordWhatsapp,
        landlordBkash: form.landlordBkash,
        landlordNagad: form.landlordNagad,
        rentalMonth: form.rentalMonth,
      });
      toast.success('Seat listing created successfully.');
      navigate('/properties');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create listing.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div style={stateStyle}>Checking authentication...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={stateStyle}>
        <h1>Host a seat</h1>
        <p>You need to be logged in to list a property.</p>
        <button type="button" onClick={() => navigate('/login')} style={primaryButtonStyle}>Go to login</button>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Host flow</div>
          <h1 style={titleStyle}>Create a bachelor seat listing</h1>
          <p style={subtleTextStyle}>Specify seats, gender preference, rent per seat, rules, and the location relative to campus or office.</p>
        </div>
      </header>

      <form onSubmit={submitListing} style={formStyle}>
        <div style={gridStyle}>
          <Field label="Listing title">
            <input value={form.title} onChange={(event) => updateField('title', event.target.value)} style={inputStyle} placeholder="2 seats near DU" />
          </Field>
          <Field label="Area">
            <input value={form.area} onChange={(event) => updateField('area', event.target.value)} style={inputStyle} placeholder="Dhanmondi" />
          </Field>
          <Field label="Nearby university">
            <input value={form.nearbyUniversity} onChange={(event) => updateField('nearbyUniversity', event.target.value)} style={inputStyle} placeholder="DU, BUET, IBA" />
          </Field>
          <Field label="Address">
            <input value={form.address} onChange={(event) => updateField('address', event.target.value)} style={inputStyle} placeholder="House / road / block" />
          </Field>
          <Field label="Total seats">
            <input type="number" value={form.totalSeats} onChange={(event) => updateField('totalSeats', event.target.value)} style={inputStyle} min="1" />
          </Field>
          <Field label="Available seats">
            <input type="number" value={form.availableSeats} onChange={(event) => updateField('availableSeats', event.target.value)} style={inputStyle} min="0" />
          </Field>
          <Field label="Gender preference">
            <select value={form.genderPreference} onChange={(event) => updateField('genderPreference', event.target.value)} style={inputStyle}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
          <Field label="Room type">
            <select value={form.roomType} onChange={(event) => updateField('roomType', event.target.value)} style={inputStyle}>
              <option value="Single Room">Single Room</option>
              <option value="Shared Seat">Shared Seat</option>
            </select>
          </Field>
          <Field label="Monthly rent per seat">
            <input type="number" value={form.monthlyRentPerSeat} onChange={(event) => updateField('monthlyRentPerSeat', event.target.value)} style={inputStyle} min="0" />
          </Field>
          <Field label="Security deposit">
            <input type="number" value={form.securityDeposit} onChange={(event) => updateField('securityDeposit', event.target.value)} style={inputStyle} min="0" />
          </Field>
          <Field label="Meal system">
            <select value={form.mealSystem} onChange={(event) => updateField('mealSystem', event.target.value)} style={inputStyle}>
              <option value="Mixed">Mixed</option>
              <option value="Mill">Mill</option>
              <option value="Bua">Bua</option>
              <option value="Self">Self</option>
            </select>
          </Field>
          <Field label="Map link or location">
            <input value={form.mapLabel} onChange={(event) => updateField('mapLabel', event.target.value)} style={inputStyle} placeholder="Paste a Google Maps link or exact location" />
          </Field>
          <Field label="Landlord WhatsApp/Mobile">
            <input value={form.landlordWhatsapp} onChange={(event) => updateField('landlordWhatsapp', event.target.value)} style={inputStyle} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="bKash number">
            <input value={form.landlordBkash} onChange={(event) => updateField('landlordBkash', event.target.value)} style={inputStyle} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Nagad number">
            <input value={form.landlordNagad} onChange={(event) => updateField('landlordNagad', event.target.value)} style={inputStyle} placeholder="01XXXXXXXXX" />
          </Field>
          <Field label="Rental month">
            <input type="month" value={form.rentalMonth} onChange={(event) => updateField('rentalMonth', event.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Amenities</h2>
          <div style={chipWrapStyle}>
            {AMENITIES.map((amenity) => (
              <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} style={form.amenities.includes(amenity) ? activeChipStyle : chipStyle}>
                {amenity}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Rules</h2>
          <div style={gridStyle}>
            <Field label="Gate closing time">
              <input value={form.rules.gateClosingTime} onChange={(event) => updateRule('gateClosingTime', event.target.value)} style={inputStyle} placeholder="11:00 PM" />
            </Field>
            <Field label="Guest policy">
              <input value={form.rules.guestPolicy} onChange={(event) => updateRule('guestPolicy', event.target.value)} style={inputStyle} placeholder="Day guests only" />
            </Field>
            <Field label="Smoking rules">
              <input value={form.rules.smokingRules} onChange={(event) => updateRule('smokingRules', event.target.value)} style={inputStyle} placeholder="Not allowed indoors" />
            </Field>
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Photos and description</h2>
          <label style={fieldStyle}>
            <span>Upload listing photos</span>
            <input type="file" accept="image/*" multiple onChange={uploadPhotos} style={inputStyle} />
          </label>
          <div style={photoPreviewGridStyle}>
            {photoUrls.map((photo) => <img key={photo} src={photo} alt="Listing preview" style={previewStyle} />)}
          </div>
          <label style={fieldStyle}>
            <span>Description</span>
            <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} style={inputStyle} rows={5} placeholder="Describe the room, safety, and meal system." />
          </label>
        </div>

        <div style={actionRowStyle}>
          <button type="submit" disabled={loading || uploading} style={primaryButtonStyle}>{loading ? 'Publishing...' : 'Publish seat listing'}</button>
          <button type="button" onClick={() => navigate('/properties')} style={secondaryButtonStyle}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

const initialFormState = {
  title: '',
  area: '',
  nearbyUniversity: '',
  address: '',
  totalSeats: 1,
  availableSeats: 1,
  genderPreference: 'Male',
  roomType: 'Shared Seat',
  monthlyRentPerSeat: '',
  securityDeposit: '',
  mealSystem: 'Mixed',
  amenities: [],
  rules: {
    gateClosingTime: '',
    guestPolicy: '',
    smokingRules: '',
    attachedBath: false,
    filteredWater: false,
    lift: false,
    wifi: false,
  },
  description: '',
  mapLabel: '',
  landlordWhatsapp: '',
  landlordBkash: '',
  landlordNagad: '',
  rentalMonth: '',
};

const AMENITIES = ['WiFi', 'Lift', 'Filtered Water', 'Attached Bath', 'Meal System', 'Security'];

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 72px', color: '#f6f1e8' };
const headerStyle = { marginBottom: '18px' };
const eyebrowStyle = { color: '#ffd166', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' };
const titleStyle = { fontSize: 'clamp(2rem, 4vw, 3.4rem)', margin: '10px 0 12px' };
const subtleTextStyle = { margin: 0, color: 'rgba(246,241,232,0.72)', maxWidth: '64ch' };
const formStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' };
const fieldStyle = { display: 'grid', gap: '8px', color: 'rgba(255,255,255,0.82)' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const sectionStyle = { marginTop: '20px' };
const sectionTitleStyle = { margin: '0 0 12px' };
const chipWrapStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px' };
const chipStyle = { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#f6f1e8', padding: '10px 12px', borderRadius: '999px' };
const activeChipStyle = { ...chipStyle, background: 'rgba(255,209,102,0.16)', color: '#ffd166', borderColor: 'rgba(255,209,102,0.35)' };
const checkboxStyle = { display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.82)' };
const actionRowStyle = { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' };
const primaryButtonStyle = { border: '0', borderRadius: '999px', padding: '12px 16px', fontWeight: 800, background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b' };
const secondaryButtonStyle = { border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '12px 16px', fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: '#f6f1e8' };
const stateStyle = { minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#fff7e6', gap: '10px' };
const photoPreviewGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' };
const previewStyle = { width: '100%', height: '160px', objectFit: 'cover', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' };

const Field = ({ label, children }) => (
  <label style={fieldStyle}>
    <span>{label}</span>
    {children}
  </label>
);

export default AddPropertyPage;