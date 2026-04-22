import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiService';

const LandlordReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/properties/mine/intelligence', { params: { month } });
        setEntries(response.data.intelligence || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load listing reports.');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [month]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={eyebrowStyle}>Landlord Intelligence</div>
        <h1 style={titleStyle}>Per-listing quality and pricing reports</h1>
        <p style={subtleStyle}>Dedicated view for listing quality assistant, dynamic pricing recommendation, commute intelligence, and rental risk.</p>
      </header>

      <section style={controlsStyle}>
        <label style={fieldStyle}>
          <span>Report month</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={inputStyle} />
        </label>
      </section>

      {loading ? <div style={stateStyle}>Loading listing reports...</div> : null}
      {!loading && entries.length === 0 ? <div style={stateStyle}>No landlord intelligence reports found.</div> : null}

      {!loading && entries.length > 0 ? (
        <section style={gridStyle}>
          {entries.map((entry) => (
            <article key={entry.propertyId} style={cardStyle}>
              <h3 style={{ margin: '0 0 8px' }}>{entry.title}</h3>
              <p style={mutedStyle}>Quality: {entry.listingQuality?.score}% (Grade {entry.listingQuality?.grade})</p>
              <p style={mutedStyle}>Pricing recommendation: ৳{entry.pricingRecommendation?.recommendedRent} ({entry.pricingRecommendation?.delta >= 0 ? '+' : ''}{entry.pricingRecommendation?.delta})</p>
              <p style={mutedStyle}>Commute score: {entry.commuteScore?.score}% ({entry.commuteScore?.label})</p>
              <p style={entry.rentalRisk?.level === 'High' ? alertTextStyle : mutedStyle}>Risk: {entry.rentalRisk?.level} ({entry.rentalRisk?.score}%)</p>
              <Link to={`/properties/${entry.propertyId}/intelligence-report`} style={reportLinkStyle}>Open full report</Link>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
};

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 72px', color: '#f6f1e8' };
const headerStyle = { marginBottom: '16px' };
const eyebrowStyle = { color: '#ffd166', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem' };
const titleStyle = { margin: '10px 0', fontSize: 'clamp(2rem, 4vw, 3.2rem)' };
const subtleStyle = { margin: 0, color: 'rgba(246,241,232,0.72)' };
const controlsStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '14px', marginBottom: '16px' };
const fieldStyle = { display: 'grid', gap: '8px' };
const inputStyle = { width: '220px', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' };
const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '18px' };
const mutedStyle = { margin: '8px 0', color: 'rgba(255,255,255,0.74)' };
const alertTextStyle = { margin: '8px 0', color: '#ff9b9b' };
const reportLinkStyle = { display: 'inline-block', marginTop: '10px', padding: '9px 12px', borderRadius: '999px', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b', textDecoration: 'none', fontWeight: 700 };
const stateStyle = { padding: '34px 0', textAlign: 'center', color: 'rgba(255,255,255,0.74)' };

export default LandlordReportsPage;
