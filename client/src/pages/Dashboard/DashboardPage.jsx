import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import apiClient from '../../services/apiService';

const DashboardPage = () => {
  const { token, isLoading: isAuthContextLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingPublications, setPendingPublications] = useState([]);
  const [rentTracker, setRentTracker] = useState([]);
  const [tenantReminders, setTenantReminders] = useState(null);
  const [landlordIntelligence, setLandlordIntelligence] = useState([]);
  const [adminInsights, setAdminInsights] = useState(null);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [trackerMonth, setTrackerMonth] = useState(currentMonth);
  const [paymentForms, setPaymentForms] = useState({});
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!token || isAuthContextLoading) {
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    try {
      const profileResponse = await authService.getCurrentUser();
      if (!profileResponse.success) {
        throw new Error('Failed to load current profile.');
      }

      const user = profileResponse.user;
      setProfile(user);

      if (user.role === 'Admin') {
        const [usersResponse, publicationResponse, insightsResponse] = await Promise.all([
          apiClient.get('/auth/admin/pending-verifications'),
          apiClient.get('/properties/admin/pending-publications'),
          apiClient.get('/properties/admin/insights'),
        ]);
        setPendingUsers(usersResponse.data.users || []);
        setPendingPublications(publicationResponse.data.properties || []);
        setAdminInsights(insightsResponse.data.insights || null);
        setProperties([]);
        setTenantReminders(null);
        setLandlordIntelligence([]);
      } else if (user.role === 'Landlord') {
        const [myPropertiesResponse, trackerResponse, intelligenceResponse] = await Promise.all([
          apiClient.get('/properties/mine'),
          apiClient.get('/properties/mine/rent-tracker', { params: { month: trackerMonth } }),
          apiClient.get('/properties/mine/intelligence', { params: { month: trackerMonth } }),
        ]);
        setProperties(myPropertiesResponse.data.properties || []);
        setRentTracker(trackerResponse.data.tracker || []);
        setLandlordIntelligence(intelligenceResponse.data.intelligence || []);
        setPendingUsers([]);
        setPendingPublications([]);
        setAdminInsights(null);
        setTenantReminders(null);
      } else {
        const [listingsResponse, remindersResponse] = await Promise.all([
          apiClient.get('/properties', { params: { limit: 100 } }),
          apiClient.get('/properties/tenant/reminders', { params: { month: currentMonth } }),
        ]);
        setProperties(listingsResponse.data.properties || []);
        setTenantReminders(remindersResponse.data.reminderEngine || null);
        setRentTracker([]);
        setPendingUsers([]);
        setPendingPublications([]);
        setAdminInsights(null);
        setLandlordIntelligence([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load dashboard data.');
    } finally {
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAuthContextLoading, token, trackerMonth]);

  const myTenantApplications = useMemo(() => (
    properties.flatMap((property) =>
      (property.seatApplications || [])
        .filter((application) => String(application.tenant?._id || application.tenant) === String(profile?.id))
        .map((application) => ({ property, application }))
    )
  ), [properties, profile?.id]);

  const monthlyRentDue = useMemo(() => (
    myTenantApplications
      .filter(({ application }) => application.status === 'Approved')
      .reduce((sum, { property }) => sum + Number(property.monthlyRentPerSeat || 0), 0)
  ), [myTenantApplications]);

  const roommateApprovedCount = useMemo(() => (
    myTenantApplications.filter(({ application }) => application.roommateRequest && application.status === 'Approved').length
  ), [myTenantApplications]);

  const pendingPaymentCount = useMemo(() => {
    if (!profile?.id) return 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    return properties.reduce((count, property) => {
      const hasPending = (property.rentPayments || []).some(
        (payment) => String(payment.tenant?._id || payment.tenant) === String(profile.id)
          && payment.month === currentMonth
          && payment.status !== 'Paid'
      );

      return count + (hasPending ? 1 : 0);
    }, 0);
  }, [profile?.id, properties]);

  const approvedTenantBookings = useMemo(() => (
    properties.flatMap((property) =>
      (property.seatApplications || [])
        .filter((application) => String(application.tenant?._id || application.tenant) === String(profile?.id) && application.status === 'Approved')
        .map((application) => ({ property, application }))
    )
  ), [profile?.id, properties]);

  const tenantMonthPaymentRows = useMemo(() => (
    approvedTenantBookings.map(({ property, application }) => {
      const payment = (property.rentPayments || []).find(
        (item) => String(item.tenant?._id || item.tenant) === String(profile?.id)
      );

      return {
        property,
        application,
        payment,
      };
    })
  ), [approvedTenantBookings, profile?.id]);

  const unpaidCurrentMonthCount = useMemo(() => {
    if (!profile?.id) return 0;

    return approvedTenantBookings.reduce((count, { property }) => {
      const payment = (property.rentPayments || []).find(
        (item) => String(item.tenant?._id || item.tenant) === String(profile.id) && item.month === currentMonth
      );

      return count + ((!payment || payment.status !== 'Paid') ? 1 : 0);
    }, 0);
  }, [approvedTenantBookings, currentMonth, profile?.id]);

  const unpaidCurrentMonthRows = useMemo(() => (
    tenantMonthPaymentRows.filter(({ property, payment }) => {
      const paymentMonth = payment?.month || property.rentalMonth || currentMonth;
      const isCurrentMonth = paymentMonth === currentMonth || paymentMonth === property.rentalMonth;
      return isCurrentMonth && (!payment || payment.status !== 'Paid');
    })
  ), [tenantMonthPaymentRows, currentMonth]);

  const totalUnpaidAmount = useMemo(() => (
    unpaidCurrentMonthRows.reduce((sum, { property, application }) => sum + (Number(property.monthlyRentPerSeat || 0) * Number(application.seatsRequested || 1)), 0)
  ), [unpaidCurrentMonthRows]);

  const duePropertyNames = useMemo(() => (
    unpaidCurrentMonthRows.map(({ property }) => property.title)
  ), [unpaidCurrentMonthRows]);

  const reviewUserVerification = async (userId, status) => {
    try {
      const response = await apiClient.patch(`/auth/admin/users/${userId}/verification`, { status });
      toast.success(response.data.message || `User ${status.toLowerCase()} successfully.`);
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update verification status.');
    }
  };

  const reviewPublication = async (propertyId, status) => {
    try {
      const response = await apiClient.patch(`/properties/admin/${propertyId}/publication`, { status });
      toast.success(response.data.message || `Property ${status.toLowerCase()} successfully.`);
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update publication status.');
    }
  };

  const updatePaymentForm = (propertyId, field, value) => {
    setPaymentForms((previous) => {
      const existing = previous[propertyId] || { provider: 'bKash', transactionId: '', month: currentMonth };
      return {
        ...previous,
        [propertyId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const submitTenantPaymentFromDashboard = async (propertyId, amountPerSeat, seatsBooked) => {
    const draft = paymentForms[propertyId] || {};
    try {
      const totalAmount = Number(amountPerSeat || 0) * Number(seatsBooked || 1);
      const response = await apiClient.post(`/properties/${propertyId}/payments`, {
        month: draft.month || currentMonth,
        provider: draft.provider || 'bKash',
        transactionId: draft.transactionId,
        amount: totalAmount,
      });
      toast.success(response.data.message || 'Rent payment submitted.');
      setPaymentForms((previous) => ({
        ...previous,
        [propertyId]: { provider: 'bKash', transactionId: '' },
      }));
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to submit rent payment.');
    }
  };

  const bulkPaymentForm = paymentForms.__bulk || { provider: 'bKash', transactionId: '', month: currentMonth };

  const updateBulkPaymentForm = (field, value) => {
    setPaymentForms((previous) => ({
      ...previous,
      __bulk: {
        ...bulkPaymentForm,
        [field]: value,
      },
    }));
  };

  const payAllDueSeats = async () => {
    if (unpaidCurrentMonthRows.length === 0) {
      toast.info('No unpaid seats found for payment.');
      return;
    }

    const monthToUse = bulkPaymentForm.month || currentMonth;

    try {
      await Promise.all(
        unpaidCurrentMonthRows.map(({ property, application }) => {
          const amount = Number(property.monthlyRentPerSeat || 0) * Number(application.seatsRequested || 1);
          return apiClient.post(`/properties/${property._id}/payments`, {
            month: monthToUse,
            provider: bulkPaymentForm.provider || 'bKash',
            transactionId: bulkPaymentForm.transactionId,
            amount,
          });
        })
      );

      toast.success('All due seat payments submitted.');
      setPaymentForms((previous) => ({
        ...previous,
        __bulk: { provider: 'bKash', transactionId: '', month: currentMonth },
      }));
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to submit all due payments.');
    }
  };

  const updateTrackedPaymentStatus = async (propertyId, paymentId, status) => {
    try {
      const response = await apiClient.patch(`/properties/${propertyId}/payments/${paymentId}`, { status });
      toast.success(response.data.message || `Payment marked as ${status}.`);
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update payment status.');
    }
  };

  if (isAuthContextLoading || isProfileLoading) {
    return <div style={loadingStyle}>Loading your dashboard...</div>;
  }

  if (!profile) {
    return (
      <div style={emptyStateStyle}>
        <h1>Dashboard unavailable</h1>
        <p>Your session may have expired.</p>
        <Link to="/login" style={ctaLinkStyle}>Return to login</Link>
      </div>
    );
  }

  const roleTitle = profile.role === 'Admin'
    ? 'System Admin Dashboard'
    : profile.role === 'Landlord'
      ? 'Landlord Dashboard'
      : 'Tenant Dashboard';

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>{roleTitle}</div>
          <h1 style={{ margin: '10px 0 12px', fontSize: 'clamp(2.2rem, 4vw, 3.6rem)' }}>
            Welcome, {profile.fullName || profile.username || profile.email}
          </h1>
          <p style={subtleTextStyle}>
            {profile.role === 'Admin' && 'Approve user verification and landlord seat publication requests.'}
            {profile.role === 'Landlord' && 'Manage seats, review seat requests, and monitor publication status.'}
            {profile.role === 'Tenant' && 'Track monthly payment needs and roommate-approved seat requests.'}
          </p>
        </div>
        <div style={statusCardStyle}>
          <div style={{ fontWeight: 700, color: '#ffd166' }}>Account role</div>
          <p style={{ margin: '10px 0 0' }}>{profile.role}</p>
          <p style={smallTextStyle}>Verification: {profile.verificationStatus || 'Verified'}</p>
          <Link to="/properties" style={ctaLinkStyle}>Go to seats</Link>
        </div>
      </section>

      {profile.role === 'Admin' && (
        <>
          <section style={gridStyle}>
            <article style={panelStyle}>
              <h2 style={panelTitleStyle}>Pending user verifications</h2>
              {pendingUsers.length > 0 ? pendingUsers.map((item) => (
                <div key={item._id} style={listItemStyle}>
                  <div>
                    <strong>{item.fullName || item.username || item.email}</strong>
                    <p style={smallTextStyle}>{item.role} · {item.verificationType}</p>
                    {item.verificationInsights ? (
                      <p style={smallTextStyle}>Doc check: {item.verificationInsights.status} ({item.verificationInsights.score}%)</p>
                    ) : null}
                  </div>
                  <div style={actionRowStyle}>
                    <button type="button" onClick={() => reviewUserVerification(item._id, 'Verified')} style={approveButtonStyle}>Approve</button>
                    <button type="button" onClick={() => reviewUserVerification(item._id, 'Rejected')} style={rejectButtonStyle}>Reject</button>
                  </div>
                </div>
              )) : <p style={mutedTextStyle}>No pending user verification requests.</p>}
            </article>

            <article style={panelStyle}>
              <h2 style={panelTitleStyle}>Pending landlord publications</h2>
              {pendingPublications.length > 0 ? pendingPublications.map((property) => (
                <div key={property._id} style={listItemStyle}>
                  <div>
                    <strong>{property.title}</strong>
                    <p style={smallTextStyle}>{property.area} · {property.landlord?.fullName || 'Landlord'}</p>
                  </div>
                  <div style={actionRowStyle}>
                    <button type="button" onClick={() => reviewPublication(property._id, 'Approved')} style={approveButtonStyle}>Publish</button>
                    <button type="button" onClick={() => reviewPublication(property._id, 'Rejected')} style={rejectButtonStyle}>Reject</button>
                  </div>
                </div>
              )) : <p style={mutedTextStyle}>No pending landlord publication requests.</p>}
            </article>

            <article style={panelStyle}>
              <h2 style={panelTitleStyle}>Smart admin insights</h2>
              {adminInsights ? (
                <>
                  <p style={infoLineStyle}><strong>Total users:</strong> {adminInsights.totalUsers}</p>
                  <p style={infoLineStyle}><strong>Total listings:</strong> {adminInsights.totalProperties}</p>
                  <p style={infoLineStyle}><strong>Pending user verifications:</strong> {adminInsights.pendingUsers}</p>
                  <p style={infoLineStyle}><strong>Pending publications:</strong> {adminInsights.pendingPublications}</p>
                  <p style={infoLineStyle}><strong>Occupancy rate:</strong> {adminInsights.occupancyRate}%</p>
                  <p style={infoLineStyle}><strong>Suspicious messages:</strong> {adminInsights.suspiciousMessages}</p>
                  <p style={infoLineStyle}><strong>Suspicious reviews:</strong> {adminInsights.suspiciousReviews}</p>
                  {(adminInsights.alerts || []).length > 0 ? (
                    <div style={alertTextStyle}>{adminInsights.alerts.join(' ')}</div>
                  ) : null}
                </>
              ) : <p style={mutedTextStyle}>No insights available yet.</p>}
            </article>
          </section>
        </>
      )}

      {profile.role === 'Landlord' && (
        <section style={gridStyle}>
          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Your seats</h2>
            {properties.length > 0 ? properties.map((property) => (
              <div key={property._id} style={listItemStyle}>
                <div>
                  <strong>{property.title}</strong>
                  <p style={smallTextStyle}>{property.area} · {property.availableSeats}/{property.totalSeats} seats</p>
                </div>
                <span style={badgeStyle(property.publicationStatus || 'Pending')}>{property.publicationStatus || 'Pending'}</span>
              </div>
            )) : <p style={mutedTextStyle}>No seats yet. Use Add Property to submit your host seat listing.</p>}
            <Link to="/add-property" style={ctaLinkStyle}>Add new seat</Link>
          </article>

          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Monthly rent tracker</h2>
            <label style={fieldStyle}>
              <span>Select month</span>
              <input type="month" value={trackerMonth} onChange={(event) => setTrackerMonth(event.target.value)} style={inputStyle} />
            </label>
            {rentTracker.length > 0 ? rentTracker.map((entry) => (
              <div key={entry.propertyId} style={listBlockStyle}>
                <strong>{entry.title}</strong>
                <p style={smallTextStyle}>{entry.area}</p>
                {entry.rentalMonth ? <p style={smallTextStyle}>Rental month: {entry.rentalMonth}</p> : null}
                <p style={smallTextStyle}>Paid: {(entry.tenants || []).filter((tenant) => tenant.payment?.status === 'Paid').length} · Unpaid: {(entry.tenants || []).filter((tenant) => !tenant.payment || tenant.payment.status !== 'Paid').length}</p>
                {entry.rentalRisk ? (
                  <p style={entry.rentalRisk.level === 'High' ? overdueTextStyle : smallTextStyle}>
                    Risk: {entry.rentalRisk.level} ({entry.rentalRisk.score}%)
                  </p>
                ) : null}
                {(entry.tenants || []).length > 0 ? (
                  (entry.tenants || [])
                    .slice()
                    .sort((left, right) => {
                      const rank = (tenant) => (tenant.payment?.status === 'Paid' ? 2 : tenant.payment?.status === 'Rejected' ? 1 : 0);
                      return rank(left) - rank(right);
                    })
                    .map((tenant) => (
                      <div key={`${entry.propertyId}-${tenant.tenantId}`} style={listItemStyle}>
                        <div>
                          <strong>{tenant.tenantName}</strong>
                          <p style={smallTextStyle}>{tenant.seatsBooked} seat(s) · {entry.month}</p>
                          <p style={tenant.payment?.status === 'Paid' ? smallTextStyle : overdueTextStyle}>Status: {tenant.payment?.status || 'Unpaid'}</p>
                        </div>
                        {tenant.payment ? (
                          <div style={actionRowStyle}>
                            <button type="button" onClick={() => updateTrackedPaymentStatus(entry.propertyId, tenant.payment.id, 'Paid')} style={approveButtonStyle}>Mark paid</button>
                            <button type="button" onClick={() => updateTrackedPaymentStatus(entry.propertyId, tenant.payment.id, 'Rejected')} style={rejectButtonStyle}>Reject</button>
                          </div>
                        ) : (
                          <span style={badgeStyle('Pending')}>Overdue</span>
                        )}
                      </div>
                    ))
                ) : (
                  <p style={mutedTextStyle}>No approved tenants for this month.</p>
                )}
              </div>
            )) : <p style={mutedTextStyle}>No monthly rent data found.</p>}
          </article>

          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>AI listing assistant</h2>
            {landlordIntelligence.length > 0 ? landlordIntelligence.map((entry) => (
              <div key={`intel-${entry.propertyId}`} style={listBlockStyle}>
                <strong>{entry.title}</strong>
                <p style={smallTextStyle}>Quality: {entry.listingQuality?.score}% (Grade {entry.listingQuality?.grade})</p>
                <p style={smallTextStyle}>Commute score: {entry.commuteScore?.score}% ({entry.commuteScore?.label})</p>
                <p style={smallTextStyle}>Pricing: ৳{entry.pricingRecommendation?.recommendedRent} ({entry.pricingRecommendation?.delta >= 0 ? '+' : ''}{entry.pricingRecommendation?.delta})</p>
                <p style={entry.rentalRisk?.level === 'High' ? overdueTextStyle : smallTextStyle}>Risk: {entry.rentalRisk?.level} ({entry.rentalRisk?.score}%)</p>
                {(entry.listingQuality?.improvements || []).slice(0, 2).map((tip) => (
                  <p key={tip} style={smallTextStyle}>Tip: {tip}</p>
                ))}
              </div>
            )) : <p style={mutedTextStyle}>No listing intelligence yet.</p>}
          </article>
        </section>
      )}

      {profile.role === 'Tenant' && (
        <section style={gridStyle}>
          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Tenant monthly summary</h2>
            <p style={infoLineStyle}><strong>Approved seats:</strong> {myTenantApplications.filter(({ application }) => application.status === 'Approved').length}</p>
            <p style={infoLineStyle}><strong>Monthly payment estimate:</strong> ৳{monthlyRentDue}</p>
            <p style={infoLineStyle}><strong>Pending payment checks:</strong> {pendingPaymentCount}</p>
            <p style={infoLineStyle}><strong>Roommate approved by landlord:</strong> {roommateApprovedCount}</p>
            <p style={infoLineStyle}><strong>Overdue properties:</strong> {duePropertyNames.length > 0 ? duePropertyNames.join(', ') : 'None'}</p>
            <p style={infoLineStyle}><strong>Total unpaid amount:</strong> ৳{totalUnpaidAmount}</p>
            {tenantReminders ? (
              <>
                <p style={infoLineStyle}><strong>Smart reminders due:</strong> {tenantReminders.dueCount}</p>
                <p style={infoLineStyle}><strong>Reminder total due:</strong> ৳{tenantReminders.totalDue}</p>
              </>
            ) : null}
          </article>

          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Your seat requests</h2>
            {myTenantApplications.length > 0 ? myTenantApplications.map(({ property, application }) => (
              <div key={application._id} style={listItemStyle}>
                <div>
                  <strong>{property.title}</strong>
                  <p style={smallTextStyle}>
                    {application.roommateRequest ? 'Roommate request' : 'Seat request'} · {application.studentIdType}
                  </p>
                  {property.rentalMonth ? <p style={smallTextStyle}>Rental month: {property.rentalMonth}</p> : null}
                </div>
                <span style={badgeStyle(application.status)}>{application.status}</span>
              </div>
            )) : <p style={mutedTextStyle}>No seat request records yet.</p>}
          </article>

          <article style={unpaidCurrentMonthCount > 0 ? warningPanelStyle : panelStyle}>
            <h2 style={panelTitleStyle}>Monthly rent payment</h2>
            {new Date().getDate() <= 5 && unpaidCurrentMonthCount > 0 && (
              <p style={alertTextStyle}>Monthly reminder: You have {unpaidCurrentMonthCount} unpaid rent item(s) for this month.</p>
            )}
            <label style={fieldStyle}>
              <span>Bulk payment month</span>
              <input type="month" value={bulkPaymentForm.month} onChange={(event) => updateBulkPaymentForm('month', event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Bulk provider</span>
              <select value={bulkPaymentForm.provider} onChange={(event) => updateBulkPaymentForm('provider', event.target.value)} style={inputStyle}>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label style={fieldStyle}>
              <span>Bulk transaction ID</span>
              <input value={bulkPaymentForm.transactionId} onChange={(event) => updateBulkPaymentForm('transactionId', event.target.value)} style={inputStyle} placeholder="Txn ID" />
            </label>
            <button type="button" onClick={payAllDueSeats} style={ctaButtonStyle} disabled={unpaidCurrentMonthRows.length === 0}>Pay all due seats</button>
            {tenantMonthPaymentRows.length > 0 ? tenantMonthPaymentRows.map(({ property, application, payment }) => {
              const draft = paymentForms[property._id] || { provider: 'bKash', transactionId: '', month: property.rentalMonth || currentMonth };
              const defaultPaymentMonth = property.rentalMonth || currentMonth;
              const paymentMonth = draft.month || defaultPaymentMonth;
              const seats = Number(application.seatsRequested || 1);
              const totalAmount = Number(property.monthlyRentPerSeat || 0) * seats;

              return (
                <div key={`${property._id}-${application._id}`} style={listBlockStyle}>
                  <strong>{property.title}</strong>
                  <p style={smallTextStyle}>{seats} seat(s) · Total ৳{totalAmount}</p>
                  <p style={smallTextStyle}>Rental month: {property.rentalMonth || currentMonth}</p>
                  <p style={smallTextStyle}>Payment status: {payment?.status || 'Not submitted'}</p>
                  {payment ? null : (
                    <>
                      <label style={fieldStyle}>
                        <span>Payment month</span>
                        <input type="month" value={paymentMonth} onChange={(event) => updatePaymentForm(property._id, 'month', event.target.value)} style={inputStyle} />
                      </label>
                      <label style={fieldStyle}>
                        <span>Provider</span>
                        <select value={draft.provider} onChange={(event) => updatePaymentForm(property._id, 'provider', event.target.value)} style={inputStyle}>
                          <option value="bKash">bKash</option>
                          <option value="Nagad">Nagad</option>
                          <option value="Rocket">Rocket</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                      <label style={fieldStyle}>
                        <span>Transaction ID</span>
                        <input value={draft.transactionId} onChange={(event) => updatePaymentForm(property._id, 'transactionId', event.target.value)} style={inputStyle} placeholder="Txn ID" />
                      </label>
                      <button type="button" onClick={() => submitTenantPaymentFromDashboard(property._id, property.monthlyRentPerSeat, seats)} style={ctaButtonStyle}>Submit monthly payment</button>
                    </>
                  )}
                </div>
              );
            }) : <p style={mutedTextStyle}>No approved bookings found for payment.</p>}
          </article>

          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Smart monthly reminder engine</h2>
            {(tenantReminders?.reminders || []).length > 0 ? (
              tenantReminders.reminders.map((reminder) => (
                <div key={`${reminder.propertyId}-${reminder.month}`} style={listItemStyle}>
                  <div>
                    <strong>{reminder.title}</strong>
                    <p style={smallTextStyle}>{reminder.message}</p>
                  </div>
                  <span style={badgeStyle(reminder.status === 'Paid' ? 'Approved' : 'Pending')}>৳{reminder.amount}</span>
                </div>
              ))
            ) : <p style={mutedTextStyle}>No reminder items for this month.</p>}
          </article>
        </section>
      )}
    </div>
  );
};

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 72px', color: '#f6f1e8' };
const heroStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', alignItems: 'stretch' };
const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const warningPanelStyle = { ...panelStyle, border: '1px solid rgba(229, 62, 62, 0.55)', background: 'linear-gradient(180deg, rgba(229,62,62,0.18) 0%, rgba(255,255,255,0.04) 100%)', boxShadow: '0 20px 40px rgba(229,62,62,0.18)' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' };
const statusCardStyle = { ...panelStyle, background: 'linear-gradient(180deg, rgba(255,209,102,0.12) 0%, rgba(255,255,255,0.04) 100%)' };
const panelTitleStyle = { marginTop: 0, marginBottom: '12px', fontSize: '1.15rem' };
const infoLineStyle = { margin: '10px 0', color: 'rgba(255,255,255,0.78)' };
const subtleTextStyle = { color: 'rgba(246,241,232,0.72)', margin: 0 };
const loadingStyle = { minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#fff7e6' };
const emptyStateStyle = { minHeight: '50vh', display: 'grid', placeItems: 'center', gap: '8px', color: '#fff7e6' };
const eyebrowStyle = { color: '#ffd166', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' };
const ctaLinkStyle = { display: 'inline-flex', marginTop: '12px', padding: '10px 14px', borderRadius: '999px', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b', fontWeight: 700, textDecoration: 'none' };
const listItemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)' };
const smallTextStyle = { margin: '4px 0 0', color: 'rgba(255,255,255,0.66)', fontSize: '0.92rem' };
const mutedTextStyle = { color: 'rgba(255,255,255,0.66)' };
const actionRowStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const fieldStyle = { display: 'grid', gap: '8px', marginTop: '10px', color: 'rgba(255,255,255,0.82)' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const listBlockStyle = { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' };
const alertTextStyle = { marginTop: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255, 209, 102, 0.12)', color: '#ffd166', border: '1px solid rgba(255, 209, 102, 0.35)' };
const ctaButtonStyle = { marginTop: '12px', border: '0', padding: '10px 12px', borderRadius: '999px', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b', fontWeight: 700 };
const approveButtonStyle = { border: '0', padding: '8px 12px', borderRadius: '999px', background: 'rgba(56,161,105,0.2)', color: '#8ff0b4', fontWeight: 700 };
const rejectButtonStyle = { border: '0', padding: '8px 12px', borderRadius: '999px', background: 'rgba(229,62,62,0.2)', color: '#ff9b9b', fontWeight: 700 };
const overdueTextStyle = { margin: '4px 0 0', color: '#ff9b9b', fontSize: '0.92rem' };
const badgeStyle = (status) => ({
  padding: '8px 10px',
  borderRadius: '999px',
  background: status === 'Approved' || status === 'Verified' ? 'rgba(56,161,105,0.18)' : status === 'Rejected' ? 'rgba(229,62,62,0.18)' : 'rgba(255,209,102,0.14)',
  color: status === 'Approved' || status === 'Verified' ? '#7ee2a8' : status === 'Rejected' ? '#ff9b9b' : '#ffd166',
  fontWeight: 700,
});

export default DashboardPage;
