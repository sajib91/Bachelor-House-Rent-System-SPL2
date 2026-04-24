import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiService';

const PaymentSlipPage = () => {
  const { id, paymentId } = useParams();
  const navigate = useNavigate();
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const loadSlip = async () => {
      try {
        const response = await apiClient.get(`/properties/${id}/payments/${paymentId}/slip`);
        setSlip(response.data?.slip || null);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load payment slip.');
        toast.error(fetchError.response?.data?.message || 'Unable to load payment slip.');
      } finally {
        setLoading(false);
      }
    };

    if (id && paymentId) {
      loadSlip();
    } else {
      setError('Invalid payment slip link.');
      setLoading(false);
    }
  }, [id, paymentId]);

  if (loading) {
    return <div style={stateStyle}>Loading SSL payment slip...</div>;
  }

  if (error || !slip) {
    return (
      <div style={containerStyle}>
        <div style={panelStyle}>
          <h1 style={titleStyle}>Payment slip unavailable</h1>
          <p style={textStyle}>{error || 'Unable to load payment slip.'}</p>
          <button type="button" onClick={() => navigate(-1)} style={buttonStyle}>Go back</button>
        </div>
      </div>
    );
  }

  const generatedAtText = slip.generatedAt ? new Date(slip.generatedAt).toLocaleString() : 'N/A';
  const paidAtText = slip.payment?.paidAt ? new Date(slip.payment.paidAt).toLocaleString() : 'N/A';

  const downloadPdfSlip = async () => {
    setDownloadingPdf(true);
    try {
      const response = await apiClient.get(`/properties/${id}/payments/${paymentId}/slip/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slip.slipId || 'payment-slip'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      toast.error(downloadError.response?.data?.message || 'Unable to download PDF slip.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={containerStyle}>
      <article style={panelStyle}>
        <div style={headerRowStyle}>
          <div>
            <p style={eyebrowStyle}>SSLCommerz Payment Slip</p>
            <h1 style={titleStyle}>{slip.slipId}</h1>
          </div>
          <div style={buttonRowStyle}>
            <button type="button" onClick={downloadPdfSlip} style={buttonStyle} disabled={downloadingPdf}>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</button>
            <button type="button" onClick={() => window.print()} style={buttonStyle}>Print slip</button>
          </div>
        </div>

        <section style={gridStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Property</h2>
            <p style={textStyle}><strong>Title:</strong> {slip.property?.title || '-'}</p>
            <p style={textStyle}><strong>Area:</strong> {slip.property?.area || '-'}</p>
            <p style={textStyle}><strong>Address:</strong> {slip.property?.address || '-'}</p>
          </div>

          <div>
            <h2 style={sectionTitleStyle}>Tenant</h2>
            <p style={textStyle}><strong>Name:</strong> {slip.tenant?.name || '-'}</p>
            <p style={textStyle}><strong>Email:</strong> {slip.tenant?.email || '-'}</p>
            <p style={textStyle}><strong>Phone:</strong> {slip.tenant?.phone || '-'}</p>
          </div>
        </section>

        <section style={paymentPanelStyle}>
          <h2 style={sectionTitleStyle}>Payment Details</h2>
          <p style={textStyle}><strong>Transaction ID:</strong> {slip.payment?.transactionId || '-'}</p>
          <p style={textStyle}><strong>Month:</strong> {slip.payment?.month || '-'}</p>
          <p style={textStyle}><strong>Amount:</strong> {slip.payment?.currency || 'BDT'} {slip.payment?.amount || 0}</p>
          <p style={textStyle}><strong>Provider:</strong> {slip.payment?.provider || '-'}</p>
          <p style={textStyle}><strong>Status:</strong> {slip.payment?.status || '-'}</p>
          <p style={textStyle}><strong>Paid At:</strong> {paidAtText}</p>
          <p style={textStyle}><strong>Validation ID:</strong> {slip.payment?.validationId || '-'}</p>
          <p style={textStyle}><strong>Bank Transaction ID:</strong> {slip.payment?.bankTransactionId || '-'}</p>
          <p style={textStyle}><strong>Card Type:</strong> {slip.payment?.cardType || '-'}</p>
          <p style={textStyle}><strong>Card Issuer:</strong> {slip.payment?.cardIssuer || '-'}</p>
          <p style={textStyle}><strong>Generated At:</strong> {generatedAtText}</p>
        </section>

        {slip.assistant?.flags?.length > 0 ? (
          <section style={assistantPanelStyle}>
            <h2 style={sectionTitleStyle}>Smart Assistant Notes</h2>
            <p style={textStyle}><strong>Status:</strong> {slip.assistant.status || 'Needs Attention'}</p>
            <ul style={listStyle}>
              {slip.assistant.flags.map((flag) => (
                <li key={flag} style={textStyle}>{flag}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <p style={noteStyle}>{slip.note || 'Generated from SSL verified transaction.'}</p>
        <div style={footerStyle}>
          <Link to={`/properties/${id}`} style={linkStyle}>Back to property</Link>
          <Link to="/dashboard" style={linkStyle}>Go to dashboard</Link>
        </div>
      </article>
    </div>
  );
};

const containerStyle = { maxWidth: '960px', margin: '0 auto', padding: '34px 18px 64px', color: '#f6f1e8' };
const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const stateStyle = { minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#fff7e6' };
const headerRowStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' };
const buttonRowStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const eyebrowStyle = { margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ffd166', fontWeight: 700, fontSize: '0.78rem' };
const titleStyle = { margin: '6px 0', fontSize: 'clamp(1.5rem, 3vw, 2rem)' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '14px' };
const paymentPanelStyle = { marginTop: '10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', background: 'rgba(255,255,255,0.03)' };
const assistantPanelStyle = { marginTop: '14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', background: 'rgba(255,255,255,0.03)' };
const sectionTitleStyle = { marginTop: 0, marginBottom: '8px', fontSize: '1rem' };
const textStyle = { margin: '6px 0', color: 'rgba(246,241,232,0.86)' };
const listStyle = { margin: '8px 0 0', paddingLeft: '18px' };
const noteStyle = { marginTop: '16px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' };
const footerStyle = { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' };
const buttonStyle = { border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', color: '#f6f1e8', fontWeight: 700 };
const linkStyle = { display: 'inline-flex', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '10px 14px', color: '#f6f1e8', fontWeight: 700 };

export default PaymentSlipPage;
