import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiService';
import contactService from '../../services/contactService';

const AdminPage = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [contactMessages, setContactMessages] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState('All');
  const [updatingMessageId, setUpdatingMessageId] = useState('');
  const [noteDrafts, setNoteDrafts] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersResponse, thresholdResponse, contactResponse] = await Promise.all([
        apiClient.get('/auth/admin/pending-verifications'),
        apiClient.get('/properties/admin/intelligence-thresholds'),
        contactService.getAdminMessages(),
      ]);

      setPendingUsers(usersResponse.data.users || []);
      setThresholds(thresholdResponse.data.thresholds || null);
      const messages = contactResponse.messages || [];
      setContactMessages(messages);
      setNoteDrafts(
        messages.reduce((accumulator, message) => {
          accumulator[message._id] = message.adminNote || '';
          return accumulator;
        }, {})
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load admin approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    return pendingUsers.filter((user) => {
      const roleMatch = userRoleFilter === 'All' || user.role === userRoleFilter;
      const searchText = userSearch.trim().toLowerCase();
      const searchMatch = !searchText
        || [user.fullName, user.username, user.email, user.phoneNumber, user.verificationType]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(searchText));

      return roleMatch && searchMatch;
    });
  }, [pendingUsers, userRoleFilter, userSearch]);

  const filteredContactMessages = useMemo(() => {
    return contactMessages.filter((message) => {
      const statusMatch = contactStatusFilter === 'All' || message.status === contactStatusFilter;
      const searchText = contactSearch.trim().toLowerCase();
      const searchMatch = !searchText
        || [message.name, message.email, message.phone, message.topic, message.message, message.adminNote]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(searchText));

      return statusMatch && searchMatch;
    });
  }, [contactMessages, contactStatusFilter, contactSearch]);

  const reviewUser = async (userId, status) => {
    try {
      const response = await apiClient.patch(`/auth/admin/users/${userId}/verification`, { status });
      toast.success(response.data.message || `User ${status.toLowerCase()} successfully.`);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update user verification.');
    }
  };

  const updateThreshold = (group, key, value) => {
    setThresholds((previous) => ({
      ...(previous || {}),
      [group]: {
        ...(previous?.[group] || {}),
        [key]: Number(value),
      },
    }));
  };

  const saveThresholds = async () => {
    if (!thresholds) return;
    setSavingThresholds(true);
    try {
      const response = await apiClient.patch('/properties/admin/intelligence-thresholds', { thresholds });
      setThresholds(response.data.thresholds || thresholds);
      toast.success(response.data.message || 'Threshold settings saved.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save threshold settings.');
    } finally {
      setSavingThresholds(false);
    }
  };

  const updateContactMessage = async (messageId, payload) => {
    setUpdatingMessageId(messageId);
    try {
      const response = await contactService.updateAdminMessage(messageId, payload);
      toast.success(response.message || 'Contact message updated.');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update contact message.');
    } finally {
      setUpdatingMessageId('');
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  };

  if (loading) {
    return <div style={loadingStyle}>Loading admin approvals...</div>;
  }

  return (
    <div style={pageStyle}>
      <header style={heroStyle}>
        <div style={eyebrowStyle}>System Admin Console</div>
        <h1 style={titleStyle}>Verification and Publication Approvals</h1>
        <p style={subtitleStyle}>Review tenant/landlord identity verification and landlord listing publication requests.</p>
      </header>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h2 style={panelTitleStyle}>Pending User Verifications ({filteredUsers.length})</h2>
          <div style={filtersRowStyle}>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search user, email, phone, verification type"
              style={inputStyle}
            />
            <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)} style={inputStyle}>
              <option value="All">All Roles</option>
              <option value="Tenant">Tenant</option>
              <option value="Landlord">Landlord</option>
            </select>
          </div>

          {filteredUsers.length > 0 ? filteredUsers.map((user) => (
            <div key={user._id} style={itemRowStyle}>
              <div>
                <strong>{user.fullName || user.username || user.email}</strong>
                <p style={metaStyle}>{user.role} · {user.verificationType} · {user.email}</p>
                <p style={metaStyle}>{user.phoneNumber || 'No phone'}</p>
              </div>
              <div style={actionRowStyle}>
                <button type="button" style={approveStyle} onClick={() => reviewUser(user._id, 'Verified')}>Approve</button>
                <button type="button" style={rejectStyle} onClick={() => reviewUser(user._id, 'Rejected')}>Reject</button>
              </div>
            </div>
          )) : <p style={emptyStyle}>No matching pending verifications.</p>}
        </article>

        <article style={panelStyle}>
          <h2 style={panelTitleStyle}>Intelligence Threshold Settings</h2>
          <p style={metaStyle}>Edit scoring sensitivity for fraud, rental risk, pricing, and listing quality grades.</p>
          {thresholds ? (
            <div style={thresholdGridStyle}>
              <label style={fieldStyle}>
                <span>Fraud medium</span>
                <input type="number" min="0" max="100" value={thresholds.fraud?.medium ?? 40} onChange={(event) => updateThreshold('fraud', 'medium', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>Fraud high</span>
                <input type="number" min="0" max="100" value={thresholds.fraud?.high ?? 70} onChange={(event) => updateThreshold('fraud', 'high', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>Risk medium</span>
                <input type="number" min="0" max="100" value={thresholds.risk?.medium ?? 40} onChange={(event) => updateThreshold('risk', 'medium', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>Risk high</span>
                <input type="number" min="0" max="100" value={thresholds.risk?.high ?? 70} onChange={(event) => updateThreshold('risk', 'high', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>Low occupancy</span>
                <input type="number" min="0" max="1" step="0.01" value={thresholds.pricing?.lowOccupancy ?? 0.35} onChange={(event) => updateThreshold('pricing', 'lowOccupancy', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>High occupancy</span>
                <input type="number" min="0" max="1" step="0.01" value={thresholds.pricing?.highOccupancy ?? 0.8} onChange={(event) => updateThreshold('pricing', 'highOccupancy', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>Quality grade A</span>
                <input type="number" min="0" max="100" value={thresholds.quality?.gradeA ?? 85} onChange={(event) => updateThreshold('quality', 'gradeA', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>Quality grade B</span>
                <input type="number" min="0" max="100" value={thresholds.quality?.gradeB ?? 70} onChange={(event) => updateThreshold('quality', 'gradeB', event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldStyle}>
                <span>Quality grade C</span>
                <input type="number" min="0" max="100" value={thresholds.quality?.gradeC ?? 55} onChange={(event) => updateThreshold('quality', 'gradeC', event.target.value)} style={inputStyle} />
              </label>
            </div>
          ) : <p style={emptyStyle}>Threshold settings unavailable.</p>}
          <button type="button" style={approveStyle} disabled={savingThresholds || !thresholds} onClick={saveThresholds}>{savingThresholds ? 'Saving...' : 'Save Threshold Settings'}</button>
        </article>

        <article style={panelStyle}>
          <h2 style={panelTitleStyle}>Contact Inbox ({filteredContactMessages.length})</h2>
          <p style={metaStyle}>Admin can review user-reported problems and mark resolution status.</p>
          <div style={filtersRowStyle}>
            <input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder="Search name, email, topic or issue"
              style={inputStyle}
            />
            <select value={contactStatusFilter} onChange={(event) => setContactStatusFilter(event.target.value)} style={inputStyle}>
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {filteredContactMessages.length > 0 ? filteredContactMessages.map((message) => (
            <div key={message._id} style={itemRowStyle}>
              <div style={{ flex: 1 }}>
                <strong>{message.name} ({message.topic})</strong>
                <p style={metaStyle}>{message.email}{message.phone ? ` · ${message.phone}` : ''}</p>
                <p style={metaStyle}>Submitted: {formatDateTime(message.createdAt)}</p>
                <p style={{ marginTop: '8px', marginBottom: '8px' }}>{message.message}</p>
                <p style={metaStyle}>Status: <span style={statusBadgeStyle(message.status)}>{message.status || 'Open'}</span></p>
                <p style={metaStyle}>Resolved: {message.resolvedAt ? formatDateTime(message.resolvedAt) : 'Not resolved yet'}</p>
                <textarea
                  value={noteDrafts[message._id] || ''}
                  onChange={(event) => setNoteDrafts((previous) => ({ ...previous, [message._id]: event.target.value }))}
                  placeholder="Add admin note"
                  rows={3}
                  style={textareaStyle}
                />
              </div>
              <div style={actionRowStyle}>
                <button type="button" style={approveStyle} disabled={updatingMessageId === message._id} onClick={() => updateContactMessage(message._id, { status: 'In Progress' })}>In Progress</button>
                <button type="button" style={approveStyle} disabled={updatingMessageId === message._id} onClick={() => updateContactMessage(message._id, { status: 'Resolved', adminNote: noteDrafts[message._id] || '' })}>Mark Resolved</button>
                <button type="button" style={rejectStyle} disabled={updatingMessageId === message._id} onClick={() => updateContactMessage(message._id, { status: 'Open' })}>Reopen</button>
                <button type="button" style={neutralButtonStyle} disabled={updatingMessageId === message._id} onClick={() => updateContactMessage(message._id, { adminNote: noteDrafts[message._id] || '' })}>Save Note</button>
              </div>
            </div>
          )) : <p style={emptyStyle}>No contact issues found for this filter.</p>}
        </article>
      </section>
    </div>
  );
};

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 72px', color: '#f6f1e8' };
const heroStyle = { marginBottom: '18px' };
const eyebrowStyle = { color: '#ffd166', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' };
const titleStyle = { margin: '10px 0 8px', fontSize: 'clamp(2rem, 3.5vw, 3rem)' };
const subtitleStyle = { color: 'rgba(246,241,232,0.72)', margin: 0 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' };
const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const panelTitleStyle = { marginTop: 0, marginBottom: '12px' };
const filtersRowStyle = { display: 'grid', gap: '10px', marginBottom: '10px' };
const thresholdGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginTop: '12px', marginBottom: '12px' };
const fieldStyle = { display: 'grid', gap: '6px', color: 'rgba(255,255,255,0.82)' };
const inputStyle = { width: '100%', padding: '11px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const itemRowStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)' };
const metaStyle = { margin: '4px 0 0', color: 'rgba(255,255,255,0.68)', fontSize: '0.9rem' };
const actionRowStyle = { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' };
const approveStyle = { border: '0', borderRadius: '999px', padding: '9px 12px', background: 'rgba(56,161,105,0.2)', color: '#8ff0b4', fontWeight: 700 };
const rejectStyle = { border: '0', borderRadius: '999px', padding: '9px 12px', background: 'rgba(229,62,62,0.2)', color: '#ff9b9b', fontWeight: 700 };
const neutralButtonStyle = { border: '0', borderRadius: '999px', padding: '9px 12px', background: 'rgba(144,205,244,0.2)', color: '#b6dcff', fontWeight: 700 };
const textareaStyle = { width: '100%', marginTop: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', padding: '10px', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const statusBadgeStyle = (status) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '999px',
  marginLeft: '6px',
  background: status === 'Resolved'
    ? 'rgba(56,161,105,0.2)'
    : status === 'In Progress'
      ? 'rgba(236,201,75,0.2)'
      : 'rgba(229,62,62,0.2)',
  color: status === 'Resolved'
    ? '#8ff0b4'
    : status === 'In Progress'
      ? '#ffe899'
      : '#ffb3b3',
});
const emptyStyle = { color: 'rgba(255,255,255,0.66)' };
const loadingStyle = { minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#fff7e6' };

export default AdminPage;
