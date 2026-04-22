import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiService';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const [featuredListings, setFeaturedListings] = useState([]);

  const isAdmin = user?.role === 'Admin';
  const isLandlord = user?.role === 'Landlord';
  const showCreateAccount = !isAuthenticated;
  const showHostRoom = !isAdmin && (isLandlord || !isAuthenticated);
  const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  const resolveImageUrl = (photoUrl) => {
    if (!photoUrl || typeof photoUrl !== 'string') return '';
    return photoUrl.startsWith('http') ? photoUrl : `${backendBaseUrl}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
  };

  useEffect(() => {
    const loadFeaturedListings = async () => {
      try {
        const response = await apiClient.get('/properties', {
          params: { limit: 3, sortBy: 'smartMatch', smartMatch: 'true' },
        });
        setFeaturedListings(Array.isArray(response.data.properties) ? response.data.properties : []);
      } catch (error) {
        setFeaturedListings([]);
      }
    };

    loadFeaturedListings();
  }, []);

  return (
    <div style={pageStyle}>
      <section style={heroGridStyle}>
        <div>
          <div style={badgeStyle}>Verified seat marketplace for Dhaka bachelors</div>
          <h1 style={heroTitleStyle}>Find a safe seat, not a headache.</h1>
          <p style={leadStyle}>
            Bachelor House Rent System connects verified tenants and credible landlords with seat-based listings,
            digital approvals, map precision, and monthly rent handling built for Dhaka.
          </p>
          <div style={ctaRowStyle}>
            <Link to="/properties" style={primaryCtaStyle}>Explore seats</Link>
            {showCreateAccount && <Link to="/register" style={secondaryCtaStyle}>Create account</Link>}
            {isAuthenticated && isAdmin && <Link to="/dashboard" style={secondaryCtaStyle}>Admin dashboard</Link>}
            {isAuthenticated && !isAdmin && <Link to="/dashboard" style={secondaryCtaStyle}>{isLandlord ? 'Landlord dashboard' : 'Tenant dashboard'}</Link>}
            {showHostRoom && <Link to="/add-property" style={secondaryCtaStyle}>Host a room</Link>}
          </div>
          <div style={welcomeLineStyle}>
            {isAuthenticated ? `Welcome back, ${user?.fullName || user?.username || user?.email}.` : 'One account works for tenants and landlords.'}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={cardGridStyle}>
            {[
              ['Verified IDs', 'Student ID / NID based trust'],
              ['Seat approvals', 'Landlords approve requests'],
              ['Monthly rent', 'bKash / Nagad tracking'],
              ['Live chat', 'Pre-booking questions'],
            ].map(([title, text]) => (
              <div key={title} style={featureTileStyle}>
                <div style={featureTitleStyle}>{title}</div>
                <div style={featureTextStyle}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={contentSectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>How it works</h2>
          <p style={sectionTextStyle}>A narrow workflow for Dhaka's bachelor-seat rental market.</p>
        </div>
        <div style={stepsGridStyle}>
          {[
            ['1. Register', 'Create one account with your name, email, and phone number. Upload your ID to build trust.'],
            ['2. Search seats', 'Filter by area, budget, gender preference, room type, and university proximity.'],
            ['3. Apply & chat', 'Send a seat request, ask questions in chat, and wait for landlord approval.'],
            ['4. Pay monthly', 'Settle rent through the app and keep a digital record of every payment.'],
          ].map(([title, text]) => (
            <article key={title} style={stepCardStyle}>
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              <p style={stepTextStyle}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={contentSectionStyle}>
        <div style={sectionHeaderRowStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Featured seats</h2>
            <p style={sectionTextStyle}>A few live listings pulled from the marketplace.</p>
          </div>
          <Link to="/properties" style={textLinkStyle}>View all listings</Link>
        </div>

        <div style={listingGridStyle}>
          {featuredListings.length > 0 ? featuredListings.map((listing) => (
            <article key={listing._id} style={listingCardStyle}>
              {resolveImageUrl(listing.photos?.[0]) ? (
                <img src={resolveImageUrl(listing.photos?.[0])} alt={listing.title} style={listingImageStyle} />
              ) : (
                <div style={listingImagePlaceholderStyle}>No image available</div>
              )}
              <div style={listingMetaStyle}>{listing.area}</div>
              <h3 style={{ margin: '10px 0 6px' }}>{listing.title}</h3>
              <p style={mutedTextStyle}>{listing.nearbyUniversity || 'Near university corridor'}</p>
              {typeof listing.matchScore === 'number' ? <div style={featuredMatchBadgeStyle}>Smart Match {listing.matchScore}%</div> : null}
              <div style={listingInfoRowStyle}>
                <span>{listing.genderPreference}</span>
                <span>{listing.availableSeats}/{listing.totalSeats} seats</span>
              </div>
              <div style={rentStyle}>৳{listing.monthlyRentPerSeat}/seat</div>
              <Link to={`/properties/${listing._id}`} style={listingLinkStyle}>Open details</Link>
            </article>
          )) : (
            <article style={{ ...listingCardStyle, gridColumn: '1 / -1' }}>
              <h3 style={{ marginTop: 0 }}>No listings yet</h3>
              <p style={mutedTextStyle}>Landlords can add the first verified seat listing from the host flow.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
};

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '72px 20px 72px', color: '#f6f1e8' };
const heroGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', alignItems: 'center' };
const badgeStyle = { display: 'inline-flex', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: 'rgba(255, 209, 102, 0.12)', border: '1px solid rgba(255, 209, 102, 0.25)', color: '#ffd166', fontSize: '0.85rem', marginBottom: '18px' };
const heroTitleStyle = { fontSize: 'clamp(2.8rem, 6vw, 5.6rem)', lineHeight: 0.95, margin: 0, maxWidth: '10ch' };
const leadStyle = { marginTop: '18px', maxWidth: '60ch', fontSize: '1.05rem', color: 'rgba(246,241,232,0.78)' };
const ctaRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '28px' };
const primaryCtaStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 18px', borderRadius: '999px', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#0b1220', fontWeight: 700, textDecoration: 'none' };
const secondaryCtaStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 18px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#f6f1e8', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)' };
const welcomeLineStyle = { marginTop: '28px', color: 'rgba(246,241,232,0.8)' };
const infoCardStyle = { background: 'linear-gradient(180deg, rgba(15,22,36,0.92) 0%, rgba(26,33,48,0.86) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' };
const cardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' };
const featureTileStyle = { padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' };
const featureTitleStyle = { color: '#ffd166', fontWeight: 700 };
const featureTextStyle = { marginTop: '6px', color: 'rgba(255,255,255,0.72)', fontSize: '0.95rem' };
const contentSectionStyle = { paddingTop: '72px' };
const sectionHeaderStyle = { marginBottom: '18px' };
const sectionHeaderRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' };
const sectionTitleStyle = { fontSize: '2rem', margin: 0 };
const sectionTextStyle = { color: 'rgba(246,241,232,0.72)', marginTop: '8px' };
const stepsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' };
const stepCardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' };
const stepTextStyle = { marginBottom: 0, color: 'rgba(255,255,255,0.72)' };
const listingGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' };
const listingCardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' };
const listingImageStyle = { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.08)' };
const listingImagePlaceholderStyle = { width: '100%', height: '180px', borderRadius: '16px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)' };
const listingMetaStyle = { fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#ffd166' };
const featuredMatchBadgeStyle = { marginTop: '10px', display: 'inline-block', padding: '6px 10px', borderRadius: '999px', fontSize: '0.8rem', border: '1px solid rgba(143, 240, 180, 0.45)', color: '#8ff0b4', background: 'rgba(56,161,105,0.18)', fontWeight: 700 };
const mutedTextStyle = { margin: 0, color: 'rgba(255,255,255,0.72)' };
const listingInfoRowStyle = { marginTop: '14px', display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'rgba(255,255,255,0.8)' };
const rentStyle = { marginTop: '18px', fontSize: '1.4rem', fontWeight: 800 };
const listingLinkStyle = { display: 'inline-block', marginTop: '18px', color: '#0b1220', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', padding: '10px 14px', borderRadius: '999px', fontWeight: 700, textDecoration: 'none' };
const textLinkStyle = { color: '#ffd166', fontWeight: 700, textDecoration: 'none' };

export default HomePage;