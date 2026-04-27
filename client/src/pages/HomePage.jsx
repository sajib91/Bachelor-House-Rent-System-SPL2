import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  const isAdmin = user?.role === 'Admin';
  const isLandlord = user?.role === 'Landlord';
  const showCreateAccount = !isAuthenticated;
  const showHostRoom = !isAdmin && (isLandlord || !isAuthenticated);

  return (
    <div style={pageStyle}>
      <section style={heroGridStyle}>
        <div>
          <div style={badgeStyle}>Verified seat marketplace for Dhaka bachelors</div>
          <h1 style={heroTitleStyle}>Find a safe seat, not a headache.</h1>
          <p style={leadStyle}>
            BHRS-SPL-2 connects verified tenants and credible landlords with seat-based listings,
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
const sectionTitleStyle = { fontSize: '2rem', margin: 0 };
const sectionTextStyle = { color: 'rgba(246,241,232,0.72)', marginTop: '8px' };
const stepsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' };
const stepCardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' };
const stepTextStyle = { marginBottom: 0, color: 'rgba(255,255,255,0.72)' };
const mutedTextStyle = { margin: 0, color: 'rgba(255,255,255,0.72)' };

export default HomePage;