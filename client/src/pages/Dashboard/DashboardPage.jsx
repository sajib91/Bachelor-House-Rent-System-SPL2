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
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [removeModal, setRemoveModal] = useState({ open: false, propertyId: null, title: '', feedback: '' });
  const [isRemovingProperty, setIsRemovingProperty] = useState(false);
  const [moderationStatusFilter, setModerationStatusFilter] = useState('All');
  const [isReviewingApplication, setIsReviewingApplication] = useState(false);
  const [isSubmittingSecurePayment, setIsSubmittingSecurePayment] = useState(false);
  const [isUploadingPaymentSlip, setIsUploadingPaymentSlip] = useState(false);
  const [securePaymentModal, setSecurePaymentModal] = useState({
    open: false,
    step: 1,
    propertyId: null,
    applicationId: null,
    title: '',
    month: currentMonth,
    amount: 0,
    provider: 'Nagad',
    mobileAccountNo: '',
    otp: '',
    pin: '',
    paymentSlipUrl: '',
  });

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
        const [usersResponse, publicationResponse, insightsResponse, allListingsResponse] = await Promise.all([
          apiClient.get('/auth/admin/pending-verifications'),
          apiClient.get('/properties/admin/pending-publications'),
          apiClient.get('/properties/admin/insights'),
          apiClient.get('/properties/mine'),
        ]);
        setPendingUsers(usersResponse.data.users || []);
        setPendingPublications(publicationResponse.data.properties || []);
        setAdminInsights(insightsResponse.data.insights || null);
        setProperties(allListingsResponse.data.properties || []);
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

  const filteredModerationListings = useMemo(() => {
    if (moderationStatusFilter === 'All') {
      return properties;
    }

    if (moderationStatusFilter === 'Active') {
      return properties.filter((property) => property.isActive !== false);
    }

    return properties.filter((property) => String(property.publicationStatus || 'Pending') === moderationStatusFilter);
  }, [properties, moderationStatusFilter]);

  const landlordPendingApplications = useMemo(() => (
    properties.flatMap((property) =>
      (property.seatApplications || [])
        .filter((application) => application.status === 'Pending')
        .map((application) => ({ property, application }))
    )
  ), [properties]);

  const totalUnpaidAmount = useMemo(() => (
    unpaidCurrentMonthRows.reduce((sum, { property, application }) => sum + (Number(property.monthlyRentPerSeat || 0) * Number(application.seatsRequested || 1)), 0)
  ), [unpaidCurrentMonthRows]);

  const duePropertyNames = useMemo(() => (
    unpaidCurrentMonthRows.map(({ property }) => property.title)
  ), [unpaidCurrentMonthRows]);

  const reviewUserVerification = async (userId, status) => {
    let feedback = '';
    if (status === 'Rejected') {
      feedback = window.prompt('Provide rejection feedback for the user:')?.trim() || '';
      if (!feedback) {
        toast.error('Feedback is required to reject a user verification.');
        return;
      }
    }

    try {
      const response = await apiClient.patch(`/auth/admin/users/${userId}/verification`, { status, feedback });
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

  const openAdminRemoveModal = (property) => {
    setRemoveModal({
      open: true,
      propertyId: property?._id || null,
      title: property?.title || 'Selected listing',
      feedback: '',
    });
  };

  const closeAdminRemoveModal = () => {
    if (isRemovingProperty) return;
    setRemoveModal({ open: false, propertyId: null, title: '', feedback: '' });
  };

  const updateRemoveFeedback = (value) => {
    setRemoveModal((previous) => ({ ...previous, feedback: value }));
  };

  const confirmAdminRemoveProperty = async () => {
    const feedback = String(removeModal.feedback || '').trim();
    if (feedback.length < 5) {
      toast.error('Feedback must be at least 5 characters long.');
      return;
    }

    try {
      setIsRemovingProperty(true);
      const response = await apiClient.patch(`/properties/admin/${removeModal.propertyId}/remove`, { feedback });
      toast.success(response.data.message || 'Listing removed successfully.');
      closeAdminRemoveModal();
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to remove listing.');
    } finally {
      setIsRemovingProperty(false);
    }
  };

  const reviewSeatApplicationFromDashboard = async (propertyId, applicationId, status) => {
    try {
      setIsReviewingApplication(true);
      const response = await apiClient.patch(`/properties/${propertyId}/applications/${applicationId}`, { status });
      toast.success(response.data.message || `Seat request ${status.toLowerCase()}.`);
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to review seat request.');
    } finally {
      setIsReviewingApplication(false);
    }
  };

  const openSecurePaymentModal = (property, application) => {
    const seats = Number(application?.seatsRequested || 1);
    const totalAmount = Number(property?.monthlyRentPerSeat || 0) * seats;

    setSecurePaymentModal({
      open: true,
      step: 1,
      propertyId: property?._id,
      applicationId: application?._id,
      title: property?.title || 'Seat booking',
      month: property?.rentalMonth || currentMonth,
      amount: totalAmount,
      provider: 'Nagad',
      mobileAccountNo: '',
      otp: '',
      pin: '',
      paymentSlipUrl: '',
    });
  };

  const closeSecurePaymentModal = () => {
    if (isSubmittingSecurePayment) return;
    setSecurePaymentModal((previous) => ({ ...previous, open: false, step: 1 }));
  };

  const updateSecurePaymentField = (field, value) => {
    setSecurePaymentModal((previous) => ({ ...previous, [field]: value }));
  };

  const uploadPaymentSlipFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photos', file);

    try {
      setIsUploadingPaymentSlip(true);
      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = response.data?.urls?.[0];
      if (!url) {
        throw new Error('Upload did not return a slip URL.');
      }

      updateSecurePaymentField('paymentSlipUrl', url);
      toast.success('Payment slip uploaded successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to upload payment slip.');
    } finally {
      setIsUploadingPaymentSlip(false);
      event.target.value = '';
    }
  };

  const proceedSecurePaymentStep = () => {
    if (securePaymentModal.step === 1) {
      if (!securePaymentModal.provider || !securePaymentModal.mobileAccountNo) {
        toast.error('Select payment method and enter mobile account number.');
        return;
      }
    }

    if (securePaymentModal.step === 2) {
      if (!securePaymentModal.otp || securePaymentModal.otp.length < 4) {
        toast.error('Enter a valid OTP code.');
        return;
      }
    }

    if (securePaymentModal.step === 3) {
      if (!securePaymentModal.pin || securePaymentModal.pin.length < 4) {
        toast.error('Enter a valid payment PIN.');
        return;
      }
    }

    setSecurePaymentModal((previous) => ({ ...previous, step: Math.min(previous.step + 1, 4) }));
  };

  const submitSecurePaymentFromDashboard = async () => {
    try {
      setIsSubmittingSecurePayment(true);
      const response = await apiClient.post(`/properties/${securePaymentModal.propertyId}/payments`, {
        month: securePaymentModal.month || currentMonth,
        provider: securePaymentModal.provider,
        mobileAccountNo: securePaymentModal.mobileAccountNo,
        otp: securePaymentModal.otp,
        pin: securePaymentModal.pin,
        paymentSlipUrl: securePaymentModal.paymentSlipUrl,
        amount: securePaymentModal.amount,
      });

      toast.success(response.data.message || 'Secure payment submitted successfully.');
      closeSecurePaymentModal();
      await loadDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to complete secure payment.');
    } finally {
      setIsSubmittingSecurePayment(false);
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
          {profile.verificationStatus === 'Rejected' && profile.verificationFeedback ? (
            <p style={rejectionFeedbackStyle}>Admin feedback: {profile.verificationFeedback}</p>
          ) : null}
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
                    {item.role === 'Tenant' ? <p style={smallTextStyle}>Institute: {[item.instituteType, item.instituteName].filter(Boolean).join(' - ') || 'N/A'}</p> : null}
                    {item.role === 'Tenant' ? <p style={smallTextStyle}>Home town: {item.hometown || 'N/A'}</p> : null}
                    <div style={assetLinkRowStyle}>
                      {item.profilePictureUrl ? <a href={item.profilePictureUrl} target="_blank" rel="noreferrer" style={assetLinkStyle}>Profile picture</a> : null}
                      {item.verificationDocumentUrl ? <a href={item.verificationDocumentUrl} target="_blank" rel="noreferrer" style={assetLinkStyle}>Identity document</a> : null}
                    </div>
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
              <h2 style={panelTitleStyle}>Listing moderation</h2>
              <label style={fieldStyle}>
                <span>Filter listings</span>
                <select value={moderationStatusFilter} onChange={(event) => setModerationStatusFilter(event.target.value)} style={inputStyle}>
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Approved">Approved</option>
                </select>
              </label>
              {filteredModerationListings.length > 0 ? filteredModerationListings.map((property) => (
                <div key={`moderation-${property._id}`} style={listItemStyle}>
                  <div>
                    <strong>{property.title}</strong>
                    <p style={smallTextStyle}>{property.area} · {property.landlordName || property.landlord?.fullName || 'Landlord'}</p>
                    <p style={smallTextStyle}>Status: {property.publicationStatus || 'Pending'} · {property.isActive === false ? 'Inactive' : 'Active'}</p>
                  </div>
                  <div style={actionRowStyle}>
                    <button type="button" onClick={() => openAdminRemoveModal(property)} style={rejectButtonStyle}>Remove with feedback</button>
                  </div>
                </div>
              )) : <p style={mutedTextStyle}>No listings found for the selected filter.</p>}
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
              <div key={property._id} style={listBlockStyle}>
                <div style={listItemStyle}>
                  <div>
                    <strong>{property.title}</strong>
                    <p style={smallTextStyle}>{property.area} · {property.availableSeats}/{property.totalSeats} seats</p>
                  </div>
                  <span style={badgeStyle(property.publicationStatus || 'Pending')}>{property.publicationStatus || 'Pending'}</span>
                </div>
                {(() => {
                  const removalMessage = (property.messages || [])
                    .slice()
                    .reverse()
                    .find((message) => message?.meta?.type === 'ADMIN_REMOVAL_FEEDBACK');

                  if (!removalMessage) return null;

                  return (
                    <p style={rejectionFeedbackStyle}>
                      Admin removal feedback: {removalMessage?.meta?.feedback || removalMessage.message}
                    </p>
                  );
                })()}
              </div>
            )) : <p style={mutedTextStyle}>No seats yet. Use Add Property to submit your host seat listing.</p>}
            <Link to="/add-property" style={ctaLinkStyle}>Add new seat</Link>
          </article>

          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Seat request notifications</h2>
            {landlordPendingApplications.length > 0 ? landlordPendingApplications.map(({ property, application }) => (
              <div key={`${property._id}-${application._id}`} style={listItemStyle}>
                <div>
                  <strong>{property.title}</strong>
                  <p style={smallTextStyle}>{application.tenantName || 'Tenant'} requested {application.seatsRequested || 1} seat(s)</p>
                  <p style={smallTextStyle}>{application.studentIdType || 'Student ID'} · {application.note || 'No note provided'}</p>
                </div>
                <div style={actionRowStyle}>
                  <button type="button" onClick={() => reviewSeatApplicationFromDashboard(property._id, application._id, 'Approved')} style={approveButtonStyle} disabled={isReviewingApplication}>Approve</button>
                  <button type="button" onClick={() => reviewSeatApplicationFromDashboard(property._id, application._id, 'Rejected')} style={rejectButtonStyle} disabled={isReviewingApplication}>Reject</button>
                </div>
              </div>
            )) : <p style={mutedTextStyle}>No new seat application notifications.</p>}
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
            <p style={smallTextStyle}>SSL secure flow: payment method -&gt; mobile account -&gt; OTP -&gt; PIN -&gt; payment slip with QR authentication.</p>
            {tenantMonthPaymentRows.length > 0 ? tenantMonthPaymentRows.map(({ property, application, payment }) => {
              const seats = Number(application.seatsRequested || 1);
              const totalAmount = Number(property.monthlyRentPerSeat || 0) * seats;

              return (
                <div key={`${property._id}-${application._id}`} style={listBlockStyle}>
                  <strong>{property.title}</strong>
                  <p style={smallTextStyle}>{seats} seat(s) · Total ৳{totalAmount}</p>
                  <p style={smallTextStyle}>Rental month: {property.rentalMonth || currentMonth}</p>
                  <p style={smallTextStyle}>Payment status: {payment?.status || 'Not submitted'}</p>
                  {payment ? (
                    <>
                      {payment.paymentSlipUrl ? <a href={payment.paymentSlipUrl} target="_blank" rel="noreferrer" style={assetLinkStyle}>View payment slip</a> : null}
                      {payment.paymentSlipQr ? <p style={smallTextStyle}>QR Auth: {payment.paymentSlipQr}</p> : null}
                    </>
                  ) : (
                    <button type="button" onClick={() => openSecurePaymentModal(property, application)} style={ctaButtonStyle}>Start secure payment</button>
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

      {profile.role === 'Tenant' && securePaymentModal.open && (
        <div style={modalOverlayStyle} role="dialog" aria-modal="true" aria-label="Secure payment flow">
          <div style={modalCardStyle}>
            <h3 style={{ margin: 0 }}>Secure seat payment</h3>
            <p style={smallTextStyle}>{securePaymentModal.title} · ৳{securePaymentModal.amount}</p>
            <p style={smallTextStyle}>SSL step {securePaymentModal.step} of 4</p>

            {securePaymentModal.step === 1 && (
              <>
                <label style={fieldStyle}>
                  <span>Payment month</span>
                  <input type="month" value={securePaymentModal.month} onChange={(event) => updateSecurePaymentField('month', event.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span>Payment method</span>
                  <select value={securePaymentModal.provider} onChange={(event) => updateSecurePaymentField('provider', event.target.value)} style={inputStyle}>
                    <option value="Nagad">Nagad</option>
                    <option value="bKash">bKash</option>
                    <option value="Rocket">Rocket</option>
                    <option value="UPay">UPay</option>
                    <option value="Bank">Local Bank</option>
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span>Mobile account number</span>
                  <input value={securePaymentModal.mobileAccountNo} onChange={(event) => updateSecurePaymentField('mobileAccountNo', event.target.value)} style={inputStyle} placeholder="01XXXXXXXXX" />
                </label>
              </>
            )}

            {securePaymentModal.step === 2 && (
              <label style={fieldStyle}>
                <span>Enter OTP</span>
                <input value={securePaymentModal.otp} onChange={(event) => updateSecurePaymentField('otp', event.target.value)} style={inputStyle} placeholder="6-digit OTP" />
              </label>
            )}

            {securePaymentModal.step === 3 && (
              <label style={fieldStyle}>
                <span>Enter payment PIN</span>
                <input type="password" value={securePaymentModal.pin} onChange={(event) => updateSecurePaymentField('pin', event.target.value)} style={inputStyle} placeholder="PIN" />
              </label>
            )}

            {securePaymentModal.step === 4 && (
              <>
                <label style={fieldStyle}>
                  <span>Upload payment slip (with QR visible)</span>
                  <input type="file" accept="image/*" onChange={uploadPaymentSlipFile} style={inputStyle} disabled={isUploadingPaymentSlip} />
                </label>
                <p style={smallTextStyle}>{isUploadingPaymentSlip ? 'Uploading slip...' : securePaymentModal.paymentSlipUrl ? 'Slip uploaded and ready for secure payment.' : 'Upload the slip image to continue.'}</p>
                {securePaymentModal.paymentSlipUrl ? <a href={securePaymentModal.paymentSlipUrl} target="_blank" rel="noreferrer" style={assetLinkStyle}>Preview uploaded payment slip</a> : null}
              </>
            )}

            <div style={actionRowStyle}>
              <button type="button" onClick={closeSecurePaymentModal} style={ghostButtonStyle} disabled={isSubmittingSecurePayment}>Cancel</button>
              {securePaymentModal.step > 1 && (
                <button
                  type="button"
                  onClick={() => setSecurePaymentModal((previous) => ({ ...previous, step: Math.max(previous.step - 1, 1) }))}
                  style={ghostButtonStyle}
                  disabled={isSubmittingSecurePayment}
                >
                  Back
                </button>
              )}
              {securePaymentModal.step < 4 ? (
                <button type="button" onClick={proceedSecurePaymentStep} style={ctaButtonStyle} disabled={isSubmittingSecurePayment}>Proceed</button>
              ) : (
                <button
                  type="button"
                  onClick={submitSecurePaymentFromDashboard}
                  style={approveButtonStyle}
                  disabled={isSubmittingSecurePayment || isUploadingPaymentSlip || !securePaymentModal.paymentSlipUrl}
                >
                  Complete payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {profile.role === 'Admin' && removeModal.open && (
        <div style={modalOverlayStyle} role="dialog" aria-modal="true" aria-label="Remove listing with feedback">
          <div style={modalCardStyle}>
            <h3 style={{ margin: 0 }}>Remove listing</h3>
            <p style={smallTextStyle}>You are removing: <strong>{removeModal.title}</strong></p>
            <label style={fieldStyle}>
              <span>Feedback for landlord</span>
              <textarea
                value={removeModal.feedback}
                onChange={(event) => updateRemoveFeedback(event.target.value)}
                style={textareaStyle}
                rows={4}
                placeholder="Explain clearly why this listing is being removed..."
              />
            </label>
            <div style={actionRowStyle}>
              <button type="button" onClick={closeAdminRemoveModal} style={ghostButtonStyle} disabled={isRemovingProperty}>Cancel</button>
              <button type="button" onClick={confirmAdminRemoveProperty} style={rejectButtonStyle} disabled={isRemovingProperty}>Confirm remove</button>
            </div>
          </div>
        </div>
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
const rejectionFeedbackStyle = { margin: '8px 0 0', color: '#ffb4b4', fontSize: '0.9rem', lineHeight: 1.45 };
const assetLinkRowStyle = { display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' };
const assetLinkStyle = { color: '#ffd166', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' };
const mutedTextStyle = { color: 'rgba(255,255,255,0.66)' };
const actionRowStyle = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const fieldStyle = { display: 'grid', gap: '8px', marginTop: '10px', color: 'rgba(255,255,255,0.82)' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const listBlockStyle = { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' };
const alertTextStyle = { marginTop: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255, 209, 102, 0.12)', color: '#ffd166', border: '1px solid rgba(255, 209, 102, 0.35)' };
const ctaButtonStyle = { marginTop: '12px', border: '0', padding: '10px 12px', borderRadius: '999px', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b', fontWeight: 700 };
const ghostButtonStyle = { border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '999px', background: 'transparent', color: '#f6f1e8', fontWeight: 700 };
const approveButtonStyle = { border: '0', padding: '8px 12px', borderRadius: '999px', background: 'rgba(56,161,105,0.2)', color: '#8ff0b4', fontWeight: 700 };
const rejectButtonStyle = { border: '0', padding: '8px 12px', borderRadius: '999px', background: 'rgba(229,62,62,0.2)', color: '#ff9b9b', fontWeight: 700 };
const overdueTextStyle = { margin: '4px 0 0', color: '#ff9b9b', fontSize: '0.92rem' };
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: '16px', zIndex: 1000 };
const modalCardStyle = { width: 'min(560px, 100%)', ...panelStyle, border: '1px solid rgba(255,255,255,0.18)' };
const textareaStyle = { width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(8,12,18,0.78)', color: '#fff', resize: 'vertical' };
const badgeStyle = (status) => ({
  padding: '8px 10px',
  borderRadius: '999px',
  background: status === 'Approved' || status === 'Verified' ? 'rgba(56,161,105,0.18)' : status === 'Rejected' ? 'rgba(229,62,62,0.18)' : 'rgba(255,209,102,0.14)',
  color: status === 'Approved' || status === 'Verified' ? '#7ee2a8' : status === 'Rejected' ? '#ff9b9b' : '#ffd166',
  fontWeight: 700,
});

export default DashboardPage;
