import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiService';

const AMENITY_OPTIONS = ['WiFi', 'Lift', 'Filtered Water', 'Attached Bath', 'Meal System', 'Security'];

const PropertyListingPage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    area: '',
    nearbyUniversity: '',
    minRent: '',
    maxRent: '',
    genderPreference: '',
    roomType: '',
    amenities: [],
    sortBy: 'smartMatch',
  });

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get('/properties', {
          params: {
            page: currentPage,
            limit: 6,
            ...filters,
            amenities: filters.amenities.join(','),
            smartMatch: 'true',
          },
        });

        setListings(Array.isArray(response.data.properties) ? response.data.properties : []);
        setTotalPages(response.data.totalPages || 1);
      } catch (fetchError) {
        setError('Failed to load approved seat listings. Please try again later.');
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [currentPage, filters]);

  const toggleAmenity = (amenity) => {
    setFilters((previous) => {
      const exists = previous.amenities.includes(amenity);
      return {
        ...previous,
        amenities: exists ? previous.amenities.filter((item) => item !== amenity) : [...previous.amenities, amenity],
      };
    });
    setCurrentPage(1);
  };

  const listingCards = useMemo(() => listings, [listings]);
  const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  const resolveImageUrl = (photos = []) => {
    if (!Array.isArray(photos) || photos.length === 0) return '';
    const firstPhoto = photos[0];
    if (typeof firstPhoto !== 'string' || !firstPhoto) return '';
    return firstPhoto.startsWith('http') ? firstPhoto : `${backendBaseUrl}${firstPhoto.startsWith('/') ? '' : '/'}${firstPhoto}`;
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Approved listings</div>
          <h1 style={titleStyle}>Verified landlord seats</h1>
          <p style={subtleTextStyle}>This page shows landlord listings only after admin approval. Verified tenants can open each seat and apply.</p>
        </div>
      </header>

      <section style={filtersCardStyle}>
        <div style={filterGridStyle}>
          <label style={fieldStyle}>
            <span>Area</span>
            <input value={filters.area} onChange={(event) => updateFilter('area', event.target.value)} style={inputStyle} placeholder="e.g. Dhanmondi" />
          </label>
          <label style={fieldStyle}>
            <span>Near university</span>
            <input value={filters.nearbyUniversity} onChange={(event) => updateFilter('nearbyUniversity', event.target.value)} style={inputStyle} placeholder="DU, BUET, IBA" />
          </label>
          <label style={fieldStyle}>
            <span>Min rent</span>
            <input type="number" value={filters.minRent} onChange={(event) => updateFilter('minRent', event.target.value)} style={inputStyle} placeholder="3000" />
          </label>
          <label style={fieldStyle}>
            <span>Max rent</span>
            <input type="number" value={filters.maxRent} onChange={(event) => updateFilter('maxRent', event.target.value)} style={inputStyle} placeholder="6000" />
          </label>
          <label style={fieldStyle}>
            <span>Gender</span>
            <select value={filters.genderPreference} onChange={(event) => updateFilter('genderPreference', event.target.value)} style={inputStyle}>
              <option value="">Any</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
          <label style={fieldStyle}>
            <span>Room type</span>
            <select value={filters.roomType} onChange={(event) => updateFilter('roomType', event.target.value)} style={inputStyle}>
              <option value="">Any</option>
              <option value="Single Room">Single Room</option>
              <option value="Shared Seat">Shared Seat</option>
            </select>
          </label>
          <label style={fieldStyle}>
            <span>Sort by</span>
            <select value={filters.sortBy} onChange={(event) => updateFilter('sortBy', event.target.value)} style={inputStyle}>
              <option value="smartMatch">Smart match</option>
              <option value="availability">Availability</option>
              <option value="priceLowToHigh">Price low to high</option>
              <option value="priceHighToLow">Price high to low</option>
              <option value="popularity">Popularity</option>
            </select>
          </label>
        </div>

        <div style={amenityWrapStyle}>
          {AMENITY_OPTIONS.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              style={filters.amenities.includes(amenity) ? amenityActiveStyle : amenityButtonStyle}
            >
              {amenity}
            </button>
          ))}
        </div>
      </section>

      {loading ? <div style={stateStyle}>Loading approved listings...</div> : null}
      {error ? <div style={stateStyle}>{error}</div> : null}

      {!loading && !error && (
        <>
          {listingCards.length === 0 ? (
            <div style={stateStyle}>No approved listings are available yet.</div>
          ) : (
            <section style={cardsGridStyle}>
              {listingCards.map((listing) => (
                <article key={listing._id} style={cardStyle}>
                  {resolveImageUrl(listing.photos) ? (
                    <img src={resolveImageUrl(listing.photos)} alt={listing.title} style={listingImageStyle} />
                  ) : (
                    <div style={listingImagePlaceholderStyle}>No image available</div>
                  )}
                  <div style={cardTopStyle}>
                    <div>
                      <div style={metaStyle}>{listing.area}</div>
                      <h3 style={{ margin: '10px 0 6px' }}>{listing.title}</h3>
                      <p style={mutedStyle}>{listing.nearbyUniversity || 'Near university corridor'}</p>
                      {typeof listing.matchScore === 'number' ? <span style={matchBadgeStyle}>Smart Match {listing.matchScore}%</span> : null}
                    </div>
                    <div style={rentBadgeStyle}>৳{listing.monthlyRentPerSeat}/seat</div>
                  </div>

                  <div style={statRowStyle}>
                    <span>{listing.genderPreference}</span>
                    <span>{listing.roomType}</span>
                    <span>{listing.availableSeats}/{listing.totalSeats} seats</span>
                  </div>

                  <div style={chipRowStyle}>
                    {(listing.amenities || []).slice(0, 4).map((amenity) => (
                      <span key={amenity} style={chipStyle}>{amenity}</span>
                    ))}
                  </div>

                  <p style={descriptionStyle}>{listing.description || 'Verified seat listing with landlord approval and monthly rent tracking.'}</p>
                  <Link to={`/properties/${listing._id}`} style={detailsLinkStyle}>Open details</Link>
                </article>
              ))}
            </section>
          )}

          <div style={paginationStyle}>
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} style={paginationButtonStyle}>Previous</button>
            <span style={paginationTextStyle}>Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} style={paginationButtonStyle}>Next</button>
          </div>
        </>
      )}
    </div>
  );

  function updateFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setCurrentPage(1);
  }
};

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 72px', color: '#f6f1e8' };
const headerStyle = { marginBottom: '18px' };
const eyebrowStyle = { color: '#ffd166', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' };
const titleStyle = { fontSize: 'clamp(2rem, 4vw, 3.4rem)', margin: '10px 0 12px' };
const subtleTextStyle = { margin: 0, color: 'rgba(246,241,232,0.72)', maxWidth: '64ch' };
const filtersCardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const filterGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' };
const fieldStyle = { display: 'grid', gap: '8px', color: 'rgba(255,255,255,0.82)' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const amenityWrapStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' };
const amenityButtonStyle = { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#f6f1e8', padding: '10px 12px', borderRadius: '999px' };
const amenityActiveStyle = { ...amenityButtonStyle, background: 'rgba(255,209,102,0.16)', color: '#ffd166', borderColor: 'rgba(255,209,102,0.35)' };
const stateStyle = { padding: '36px 0', textAlign: 'center', color: 'rgba(255,255,255,0.76)' };
const cardsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' };
const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const listingImageStyle = { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.08)' };
const listingImagePlaceholderStyle = { width: '100%', height: '180px', borderRadius: '16px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)' };
const cardTopStyle = { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'start' };
const metaStyle = { color: '#ffd166', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' };
const mutedStyle = { margin: 0, color: 'rgba(255,255,255,0.68)' };
const rentBadgeStyle = { padding: '10px 12px', borderRadius: '14px', background: 'rgba(255,209,102,0.12)', color: '#ffd166', fontWeight: 800, whiteSpace: 'nowrap' };
const matchBadgeStyle = { display: 'inline-block', marginTop: '8px', padding: '6px 10px', borderRadius: '999px', fontSize: '0.8rem', border: '1px solid rgba(143, 240, 180, 0.45)', color: '#8ff0b4', background: 'rgba(56,161,105,0.18)', fontWeight: 700 };
const statRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px', color: 'rgba(255,255,255,0.78)' };
const chipRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' };
const chipStyle = { padding: '8px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.82)', fontSize: '0.88rem' };
const descriptionStyle = { color: 'rgba(255,255,255,0.72)', marginTop: '14px' };
const detailsLinkStyle = { display: 'inline-flex', marginTop: '10px', color: '#09111b', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', padding: '10px 14px', borderRadius: '999px', fontWeight: 700, textDecoration: 'none' };
const paginationStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' };
const paginationButtonStyle = { padding: '10px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#f6f1e8', fontWeight: 700 };
const paginationTextStyle = { color: 'rgba(255,255,255,0.72)' };

export default PropertyListingPage;