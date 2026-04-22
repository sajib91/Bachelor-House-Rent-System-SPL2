import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiService';

const PropertyIntelligenceReportPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [quality, setQuality] = useState(null);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [propertyResponse, qualityResponse, pricingResponse] = await Promise.all([
          apiClient.get(`/properties/${id}`),
          apiClient.get(`/properties/${id}/quality-assistant`),
          apiClient.get(`/properties/${id}/pricing-recommendation`),
        ]);

        setProperty(propertyResponse.data || null);
        setQuality(qualityResponse.data.quality || null);
        setPricing(pricingResponse.data.recommendation || null);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load intelligence report.');
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  if (loading) return <div style={stateStyle}>Loading intelligence report...</div>;
  if (!property) return <div style={stateStyle}>Intelligence report unavailable.</div>;

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={eyebrowStyle}>Per-listing report</div>
        <h1 style={titleStyle}>{property.title}</h1>
        <p style={subtleStyle}>{property.area} · Dedicated quality and pricing assistant report.</p>
      </header>

      <section style={gridStyle}>
        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Listing Quality Assistant</h2>
          <p style={lineStyle}>Score: <strong>{quality?.score ?? property.listingQuality?.score ?? 0}%</strong></p>
          <p style={lineStyle}>Grade: <strong>{quality?.grade ?? property.listingQuality?.grade ?? 'N/A'}</strong></p>
          <div style={tipBoxStyle}>
            {(quality?.improvements || property.listingQuality?.improvements || []).slice(0, 6).map((tip) => (
              <p key={tip} style={tipStyle}>- {tip}</p>
            ))}
            {(quality?.improvements || property.listingQuality?.improvements || []).length === 0 ? <p style={tipStyle}>No major quality issues detected.</p> : null}
          </div>
        </article>

        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Dynamic Pricing Recommendation</h2>
          <p style={lineStyle}>Current: <strong>৳{pricing?.currentRent ?? property.monthlyRentPerSeat}</strong></p>
          <p style={lineStyle}>Recommended: <strong>৳{pricing?.recommendedRent ?? property.pricingRecommendation?.recommendedRent ?? property.monthlyRentPerSeat}</strong></p>
          <p style={lineStyle}>Delta: <strong>{pricing?.delta >= 0 ? '+' : ''}{pricing?.delta ?? property.pricingRecommendation?.delta ?? 0}</strong></p>
          <p style={lineStyle}>Confidence: <strong>{pricing?.confidence ?? property.pricingRecommendation?.confidence ?? 0}%</strong></p>
          <p style={lineStyle}>{pricing?.reason ?? property.pricingRecommendation?.reason ?? 'No pricing recommendation available.'}</p>
        </article>

        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Commute Intelligence</h2>
          <p style={lineStyle}>Commute score: <strong>{property.commuteScore?.score ?? 50}%</strong></p>
          <p style={lineStyle}>Label: <strong>{property.commuteScore?.label ?? 'Unknown'}</strong></p>
          <p style={lineStyle}>{property.commuteScore?.recommendation || 'Add commute minutes for richer insights.'}</p>
        </article>

        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Review Signal</h2>
          <p style={lineStyle}>Average rating: <strong>{property.reviewSummary?.averageRating ?? 0}</strong></p>
          <p style={lineStyle}>Total reviews: <strong>{property.reviewSummary?.totalReviews ?? 0}</strong></p>
          <p style={lineStyle}>Use review quality + occupancy to decide whether to raise or stabilize rent.</p>
        </article>
      </section>

      <div style={{ marginTop: '18px' }}>
        <Link to="/landlord/reports" style={backLinkStyle}>Back to landlord reports</Link>
      </div>
    </div>
  );
};

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 72px', color: '#f6f1e8' };
const headerStyle = { marginBottom: '16px' };
const eyebrowStyle = { color: '#ffd166', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' };
const titleStyle = { margin: '10px 0', fontSize: 'clamp(2rem, 4vw, 3.2rem)' };
const subtleStyle = { margin: 0, color: 'rgba(246,241,232,0.72)' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' };
const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '18px' };
const cardTitleStyle = { marginTop: 0, marginBottom: '10px' };
const lineStyle = { margin: '8px 0', color: 'rgba(255,255,255,0.78)' };
const tipBoxStyle = { marginTop: '8px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' };
const tipStyle = { margin: '6px 0', color: 'rgba(255,255,255,0.74)' };
const backLinkStyle = { display: 'inline-block', padding: '10px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.15)', color: '#ffd166', textDecoration: 'none', fontWeight: 700 };
const stateStyle = { minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#fff7e6' };

export default PropertyIntelligenceReportPage;
