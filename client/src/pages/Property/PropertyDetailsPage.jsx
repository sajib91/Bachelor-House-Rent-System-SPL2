import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/socketService';

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [roommateRequest, setRoommateRequest] = useState(false);
  const [studentIdType, setStudentIdType] = useState('Student ID');
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [message, setMessage] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const typingTimeoutRef = useRef(null);
  const defaultTitleRef = useRef(typeof document !== 'undefined' ? document.title : '');

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await apiClient.get(`/properties/${id}`);
        setProperty(response.data);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || fetchError.message || 'Unable to load listing.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProperty();
    } else {
      setLoading(false);
      setError('No property ID provided.');
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const socket = getSocket();
    socket.emit('property:join', id);

    const handleIncomingMessage = (payload) => {
      if (!payload || payload.propertyId !== id || !payload.message) return;

      const isOwnMessage = String(payload.message.sender) === String(user?.id);
      if (!isOwnMessage && (document.hidden || !chatInputFocused)) {
        setUnreadCount((previous) => previous + 1);
      }

      setProperty((previous) => {
        if (!previous) return previous;
        const existing = previous.messages || [];
        const alreadyPresent = existing.some((entry) => String(entry._id) === String(payload.message._id));
        if (alreadyPresent) return previous;

        return {
          ...previous,
          messages: [...existing, payload.message],
        };
      });
    };

    const handleTypingEvent = (payload) => {
      if (!payload || payload.propertyId !== id || !payload.userId) return;
      if (String(payload.userId) === String(user?.id)) return;

      setTypingUsers((previous) => {
        const hasUser = previous.includes(payload.userId);
        if (payload.isTyping) {
          return hasUser ? previous : [...previous, payload.userId];
        }
        return previous.filter((entry) => entry !== payload.userId);
      });
    };

    const handlePropertyError = (payload) => {
      if (!payload?.message) return;
      toast.error(payload.message);
    };

    socket.on('property:message', handleIncomingMessage);
    socket.on('property:typing', handleTypingEvent);
    socket.on('property:error', handlePropertyError);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('property:typing', { propertyId: id, isTyping: false });
      socket.emit('property:leave', id);
      socket.off('property:message', handleIncomingMessage);
      socket.off('property:typing', handleTypingEvent);
      socket.off('property:error', handlePropertyError);
    };
  }, [chatInputFocused, id, user?.id]);

  useEffect(() => {
    const clearUnreadWhenVisible = () => {
      if (!document.hidden && chatInputFocused) {
        setUnreadCount(0);
      }
    };

    document.addEventListener('visibilitychange', clearUnreadWhenVisible);
    return () => {
      document.removeEventListener('visibilitychange', clearUnreadWhenVisible);
    };
  }, [chatInputFocused]);

  useEffect(() => {
    const baseTitle = defaultTitleRef.current || 'Bachelor House Rent System';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;

    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);

  useEffect(() => {
    if (property?.rentalMonth) {
      setPaymentMonth(property.rentalMonth);
    }
  }, [property?.rentalMonth]);

  const isLandlordOwner = useMemo(() => String(property?.landlord?._id || property?.landlord) === String(user?.id), [property, user?.id]);
  const isTenant = user?.role === 'Tenant';
  const tenantApplication = useMemo(() => (
    (property?.seatApplications || []).find((application) => String(application.tenant?._id || application.tenant) === String(user?.id)) || null
  ), [property?.seatApplications, user?.id]);
  const canReviewApplications = isAuthenticated && isLandlordOwner;
  const canApplyForSeat = isAuthenticated && isTenant && !isLandlordOwner && Number(property?.availableSeats || 0) > 0;
  const canPayRent = isAuthenticated && isTenant && tenantApplication?.status === 'Approved';
  const canChat = isAuthenticated && (isLandlordOwner || isTenant);
  const canReviewProperty = isAuthenticated && isTenant && Boolean(tenantApplication);
  const selectedMonthPayment = useMemo(() => (
    (property?.rentPayments || []).find((item) => (
      String(item.tenant?._id || item.tenant) === String(user?.id)
      && item.month === paymentMonth
    )) || null
  ), [paymentMonth, property?.rentPayments, user?.id]);
  const paymentJourneySteps = useMemo(() => {
    const hasApplied = Boolean(tenantApplication);
    const hasLandlordApproval = tenantApplication?.status === 'Approved';
    const hasMethodSelected = Boolean(paymentMethod);
    const hasOtpPinGatewayStep = Boolean(selectedMonthPayment) || isInitiatingPayment;
    const hasSlipReady = selectedMonthPayment?.status === 'Paid';

    return [
      { key: 'apply', label: 'Apply seat', done: hasApplied },
      { key: 'approval', label: 'Landlord approves', done: hasLandlordApproval },
      { key: 'method', label: 'Select method', done: hasMethodSelected },
      { key: 'otp', label: 'SSL OTP + PIN', done: hasOtpPinGatewayStep },
      { key: 'slip', label: 'Slip ready', done: hasSlipReady },
    ];
  }, [tenantApplication, paymentMethod, selectedMonthPayment, isInitiatingPayment]);
  const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

  const resolveImageUrl = (photoUrl) => {
    if (!photoUrl || typeof photoUrl !== 'string') return '';
    return photoUrl.startsWith('http') ? photoUrl : `${backendBaseUrl}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
  };
  const mapLocationLabel = property?.mapLocation?.label || property?.address || property?.area || '';
  const mapLocationLink = property?.mapLocation?.link || '';
  const googleMapUrl = useMemo(() => {
    if (property?.mapLocation?.latitude !== undefined && property?.mapLocation?.longitude !== undefined) {
      return `https://www.google.com/maps?q=${property.mapLocation.latitude},${property.mapLocation.longitude}&output=embed`;
    }

    if (mapLocationLink) {
      const coordMatch = mapLocationLink.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      if (coordMatch) {
        return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`;
      }

      const queryMatch = mapLocationLink.match(/[?&](?:q|query)=([^&]+)/);
      if (queryMatch?.[1]) {
        return `https://www.google.com/maps?q=${decodeURIComponent(queryMatch[1])}&output=embed`;
      }
    }

    const searchParts = [mapLocationLabel, property?.address, property?.area].filter(Boolean).join(', ');
    return searchParts ? `https://www.google.com/maps?q=${encodeURIComponent(searchParts)}&output=embed` : '';
  }, [mapLocationLabel, mapLocationLink, property?.address, property?.area, property?.mapLocation?.latitude, property?.mapLocation?.longitude]);
  const googleMapLink = mapLocationLink || (mapLocationLabel ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([mapLocationLabel, property?.address, property?.area].filter(Boolean).join(', '))}` : '');

  const applyForSeat = async () => {
    try {
      const response = await apiClient.post(`/properties/${id}/apply`, {
        note,
        roommateRequest,
        studentIdType,
        seatsRequested,
      });
      toast.success(response.data.message || 'Seat request submitted.');
      setNote('');
      setRoommateRequest(false);
      setSeatsRequested(1);
      const refreshed = await apiClient.get(`/properties/${id}`);
      setProperty(refreshed.data);
    } catch (applyError) {
      toast.error(applyError.response?.data?.message || 'Unable to submit seat request.');
    }
  };

  const submitPayment = async () => {
    setIsInitiatingPayment(true);
    try {
      const response = await apiClient.post(`/properties/${id}/payments/ssl/initiate`, {
        month: paymentMonth,
        amount: property?.monthlyRentPerSeat,
        paymentMethod,
      });

      const gatewayUrl = response.data?.gatewayUrl;
      if (!gatewayUrl) {
        throw new Error('Missing SSL gateway URL.');
      }

      toast.info('Redirecting to SSL secure payment gateway...');
      window.location.assign(gatewayUrl);
    } catch (paymentError) {
      toast.error(paymentError.response?.data?.message || 'Unable to submit payment.');
      setIsInitiatingPayment(false);
    }
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const paymentStatus = query.get('paymentStatus');

    if (!paymentStatus) return;

    if (paymentStatus === 'success') {
      toast.success('Payment successful. SSL slip is ready.');
    } else if (paymentStatus === 'cancelled') {
      toast.info('Payment was cancelled.');
    } else {
      toast.error('Payment failed or verification was not completed.');
    }

    const refresh = async () => {
      try {
        const refreshed = await apiClient.get(`/properties/${id}`);
        setProperty(refreshed.data);
      } catch (error) {
        // Keep current data and avoid blocking UI.
      } finally {
        setIsInitiatingPayment(false);
      }
    };

    refresh();
  }, [id, location.search]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      const response = await apiClient.post(`/properties/${id}/messages`, { message });
      toast.success(response.data.message || 'Message sent.');
      if (response.data.createdMessage) {
        setProperty((previous) => {
          if (!previous) return previous;
          const existing = previous.messages || [];
          const alreadyPresent = existing.some((entry) => String(entry._id) === String(response.data.createdMessage._id));
          if (alreadyPresent) return previous;

          return {
            ...previous,
            messages: [...existing, response.data.createdMessage],
          };
        });
      }
      setMessage('');
      setTypingUsers([]);
      const socket = getSocket();
      socket.emit('property:typing', { propertyId: id, isTyping: false });
    } catch (chatError) {
      toast.error(chatError.response?.data?.message || 'Unable to send message.');
    }
  };

  const submitReview = async () => {
    try {
      const response = await apiClient.post(`/properties/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success(response.data.message || 'Review submitted.');
      setReviewComment('');
      const refreshed = await apiClient.get(`/properties/${id}`);
      setProperty(refreshed.data);
    } catch (reviewError) {
      toast.error(reviewError.response?.data?.message || 'Unable to submit review.');
    }
  };

  const handleMessageInputChange = (event) => {
    const nextMessage = event.target.value;
    setMessage(nextMessage);

    if (!id || !isAuthenticated) return;

    const socket = getSocket();
    const isTyping = nextMessage.trim().length > 0;
    socket.emit('property:typing', { propertyId: id, isTyping });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('property:typing', { propertyId: id, isTyping: false });
      }, 1200);
    }
  };

  const handleMessageFocus = () => {
    setChatInputFocused(true);
    setUnreadCount(0);
  };

  const handleMessageBlur = () => {
    setChatInputFocused(false);
    if (!id || !isAuthenticated) return;
    const socket = getSocket();
    socket.emit('property:typing', { propertyId: id, isTyping: false });
  };

  const reviewApplication = async (applicationId, status) => {
    try {
      const response = await apiClient.patch(`/properties/${id}/applications/${applicationId}`, { status });
      toast.success(response.data.message || `Application ${status.toLowerCase()}.`);
      const refreshed = await apiClient.get(`/properties/${id}`);
      setProperty(refreshed.data);
    } catch (reviewError) {
      toast.error(reviewError.response?.data?.message || 'Unable to update application.');
    }
  };

  if (loading) return <div style={stateStyle}>Loading seat details...</div>;
  if (error) return <div style={stateStyle}>Error: {error}</div>;
  if (!property) return <div style={stateStyle}>Seat listing not found.</div>;

  const sanitizePhone = (value = '') => String(value).replace(/[^\d+]/g, '');
  const landlordPhoneNumber = sanitizePhone(property.landlordPhone || property.landlord?.phoneNumber || '');
  const landlordWhatsappNumber = sanitizePhone(property.landlordWhatsapp || landlordPhoneNumber);
  const whatsappLink = landlordWhatsappNumber ? `https://wa.me/${landlordWhatsappNumber.replace(/^\+/, '')}` : '';
  const phoneLink = landlordPhoneNumber ? `tel:${landlordPhoneNumber}` : '';

  return (
    <div style={pageStyle}>
      <header style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>{property.area}</div>
          <h1 style={titleStyle}>{property.title}</h1>
          <p style={subtleTextStyle}>{property.nearbyUniversity || 'Near the university corridor'} · {property.genderPreference} · {property.roomType}</p>
        </div>
        <div style={rentCardStyle}>
          <div style={rentValueStyle}>৳{property.monthlyRentPerSeat}</div>
          <div style={rentLabelStyle}>per seat / month</div>
          <div style={seatCountStyle}>{property.availableSeats}/{property.totalSeats} seats available</div>
        </div>
      </header>

      <section style={galleryStyle}>
        {(property.photos || []).map((photo, index) => (
          <img key={`${photo}-${index}`} src={resolveImageUrl(photo)} alt={`${property.title} ${index + 1}`} style={photoStyle} />
        ))}
      </section>

      {googleMapUrl && (
        <section style={mapHeroStyle}>
          <div style={sectionHeaderRowStyle}>
            <div>
              <h2 style={panelTitleStyle}>Location on map</h2>
              <p style={helperTextStyle}>Open the exact area in Google Maps or use the embedded preview below.</p>
            </div>
            <a href={googleMapLink} target="_blank" rel="noreferrer" style={mapLinkStyle}>Open in Google Maps</a>
          </div>
          <iframe title="Google Map" src={googleMapUrl} style={mapFrameHeroStyle} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </section>
      )}

      <section style={contentGridStyle}>
        <article style={panelStyle}>
          <h2 style={panelTitleStyle}>Seat details</h2>
          <p style={detailLineStyle}><strong>Address:</strong> {property.address}</p>
          <p style={detailLineStyle}><strong>Landlord:</strong> {property.landlordName || property.landlord?.fullName || 'Verified landlord'}</p>
          <p style={detailLineStyle}><strong>Meal system:</strong> {property.mealSystem}</p>
          <p style={detailLineStyle}><strong>Security deposit:</strong> ৳{property.securityDeposit || 0}</p>
          <p style={detailLineStyle}><strong>Commute:</strong> {property.commuteMinutes ? `${property.commuteMinutes} minutes` : 'Not specified'}</p>
          <p style={detailLineStyle}><strong>Map:</strong> {googleMapLink ? 'Available above' : 'Not specified'}</p>
          <p style={detailLineStyle}><strong>WhatsApp/Mobile:</strong> {property.landlordWhatsapp || property.landlordPhone || property.landlord?.phoneNumber || 'Not provided'}</p>
          <p style={detailLineStyle}><strong>bKash:</strong> {property.landlordBkash || 'Not provided'}</p>
          <p style={detailLineStyle}><strong>Nagad:</strong> {property.landlordNagad || 'Not provided'}</p>

          <div style={actionRowStyle}>
            {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" style={contactLinkStyle}>WhatsApp landlord</a>}
            {phoneLink && <a href={phoneLink} style={contactLinkStyle}>Call landlord</a>}
          </div>

          <div style={chipRowStyle}>
            {(property.amenities || []).map((amenity) => (
              <span key={amenity} style={chipStyle}>{amenity}</span>
            ))}
          </div>

          <div style={rulesGridStyle}>
            <div style={ruleCardStyle}><strong>Gate closing</strong><p>{property.rules?.gateClosingTime || 'Flexible'}</p></div>
            <div style={ruleCardStyle}><strong>Guest policy</strong><p>{property.rules?.guestPolicy || 'Ask landlord'}</p></div>
            <div style={ruleCardStyle}><strong>Smoking</strong><p>{property.rules?.smokingRules || 'Discuss before booking'}</p></div>
          </div>

          {property.description && (
            <div style={sectionBlockStyle}>
              <h3>About this listing</h3>
              <p style={bodyTextStyle}>{property.description}</p>
            </div>
          )}
        </article>

        <aside style={sideStackStyle}>
          {(isLandlordOwner || user?.role === 'Admin') && (
            <article style={panelStyle}>
              <h2 style={panelTitleStyle}>AI listing report</h2>
              <p style={bodyTextStyle}>Open the dedicated quality and dynamic pricing report for this listing.</p>
              <div style={chipRowStyle}>
                <span style={chipStyle}>Quality {property.listingQuality?.score ?? 0}%</span>
                <span style={chipStyle}>Commute {property.commuteScore?.score ?? 50}%</span>
              </div>
              <Link to={`/properties/${property._id}/intelligence-report`} style={reportLinkStyle}>Open full report</Link>
            </article>
          )}

          {isTenant ? (
          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Apply for seat</h2>
            <p style={bodyTextStyle}>Send a seat request or ask for a roommate match. Only the landlord can approve or reject your request.</p>
            <label style={fieldStyle}>
              <span>Identity type</span>
              <select value={studentIdType} onChange={(event) => setStudentIdType(event.target.value)} style={inputStyle}>
                <option value="Student ID">Student ID</option>
                <option value="NID">NID</option>
                <option value="Passport">Passport</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label style={fieldStyle}>
              <span>Seats needed</span>
              <input type="number" min="1" max={property.availableSeats || 1} value={seatsRequested} onChange={(event) => setSeatsRequested(Number(event.target.value || 1))} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Request note</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={inputStyle} placeholder="Tell the landlord a little about yourself." />
            </label>
            <label style={checkboxStyle}>
              <input type="checkbox" checked={roommateRequest} onChange={(event) => setRoommateRequest(event.target.checked)} />
              Roommate request
            </label>
            <button type="button" onClick={applyForSeat} disabled={!canApplyForSeat} style={primaryButtonStyle}>
              {canApplyForSeat ? 'Apply for seat' : 'Apply unavailable'}
            </button>
            {isLandlordOwner && <p style={helperTextStyle}>You cannot apply to your own listing.</p>}
            {!isAuthenticated && <p style={helperTextStyle}>Login as a tenant to submit a request.</p>}
            {(property.availableSeats || 0) <= 0 && <p style={helperTextStyle}>Fully booked. New requests are closed.</p>}
          </article>
          ) : (
            <article style={panelStyle}>
              <h2 style={panelTitleStyle}>Apply for seat</h2>
              <p style={bodyTextStyle}>Only tenant accounts can apply for seats on this system.</p>
            </article>
          )}

          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Monthly rent</h2>
            {isTenant ? null : <p style={bodyTextStyle}>Only tenants with an approved seat can submit rent payments.</p>}
            <label style={fieldStyle}>
              <span>Month</span>
              <input type="month" value={paymentMonth} onChange={(event) => setPaymentMonth(event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Payment method</span>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} style={inputStyle}>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Card">Card</option>
              </select>
            </label>
            <p style={helperTextStyle}>Gateway: SSLCommerz secure checkout. Amount: ৳{property?.monthlyRentPerSeat || 0}</p>
            <p style={helperTextStyle}>Flow: choose method, enter mobile account number, submit OTP, then PIN. Payment confirmation slip is generated automatically.</p>
            <div style={paymentJourneyStyle}>
              {paymentJourneySteps.map((step, index) => (
                <div key={step.key} style={paymentStepStyle(step.done)}>
                  <span style={paymentStepIndexStyle(step.done)}>{index + 1}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
            {selectedMonthPayment ? (
              <div style={paymentStatusCardStyle}>
                <p style={detailLineStyle}><strong>Status:</strong> {selectedMonthPayment.status}</p>
                <p style={detailLineStyle}><strong>Provider:</strong> {selectedMonthPayment.provider}</p>
                <p style={detailLineStyle}><strong>Transaction:</strong> {selectedMonthPayment.transactionId}</p>
                {selectedMonthPayment.status === 'Paid' ? (
                  <Link to={`/payments/slip/${id}/${selectedMonthPayment._id}`} style={contactLinkStyle}>View SSL payment slip</Link>
                ) : null}
                {selectedMonthPayment.assistant?.flags?.length > 0 ? (
                  <p style={helperTextStyle}>Assistant: {selectedMonthPayment.assistant.flags.join(' ')}</p>
                ) : null}
              </div>
            ) : null}
            <button type="button" onClick={submitPayment} disabled={!canPayRent || isInitiatingPayment} style={secondaryButtonStyle}>
              {canPayRent ? (isInitiatingPayment ? 'Redirecting to SSL...' : 'Pay with SSLCommerz') : 'Payment unavailable'}
            </button>
            {isTenant && tenantApplication?.status !== 'Approved' && (
              <p style={helperTextStyle}>Payment opens only after landlord approval of your seat request.</p>
            )}
          </article>

          {canChat ? (
            <article style={panelStyle}>
              <h2 style={panelTitleStyle}>Chat {unreadCount > 0 ? <span style={badgeStyle}>{unreadCount} new</span> : null}</h2>
              <div style={chatHistoryStyle}>
                {(property.messages || []).length > 0 ? property.messages.map((chatItem) => (
                  <div key={chatItem._id} style={chatBubbleStyle(String(chatItem.sender) === String(user?.id))}>
                    <div style={chatSenderStyle}>{chatItem.senderName} ({chatItem.senderRole})</div>
                    <div style={chatMessageStyle}>{chatItem.message}</div>
                    <div style={chatTimeStyle}>{chatItem.createdAt ? new Date(chatItem.createdAt).toLocaleString() : ''}</div>
                  </div>
                )) : <p style={helperTextStyle}>No messages yet. Start the conversation.</p>}
              </div>
              {typingUsers.length > 0 && <p style={typingTextStyle}>{typingUsers.length === 1 ? 'Someone is typing...' : `${typingUsers.length} people are typing...`}</p>}
              <label style={fieldStyle}>
                <span>Send a message</span>
                <textarea value={message} onChange={handleMessageInputChange} onFocus={handleMessageFocus} onBlur={handleMessageBlur} rows={4} style={inputStyle} placeholder="Is the meal rate included?" />
              </label>
              <button type="button" onClick={sendMessage} disabled={!canChat} style={secondaryButtonStyle}>
                Send chat message
              </button>
            </article>
          ) : (
            <article style={panelStyle}>
              <h2 style={panelTitleStyle}>Chat</h2>
              <p style={bodyTextStyle}>Chat is available for tenants and the landlord of this listing only.</p>
            </article>
          )}

          <article style={panelStyle}>
            <h2 style={panelTitleStyle}>Tenant reviews</h2>
            {(property.reviews || []).length > 0 ? (
              <div style={chatHistoryStyle}>
                {[...(property.reviews || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((review) => (
                  <div key={review._id} style={chatBubbleStyle(false)}>
                    <div style={chatSenderStyle}>{review.tenantName}</div>
                    <div style={chatMessageStyle}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                    <div style={chatMessageStyle}>{review.comment || 'No written comment.'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={helperTextStyle}>No reviews yet.</p>
            )}

            {canReviewProperty ? (
              <>
                <label style={fieldStyle}>
                  <span>Your rating</span>
                  <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} style={inputStyle}>
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Poor</option>
                    <option value={1}>1 - Bad</option>
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span>Review comment</span>
                  <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={3} style={inputStyle} placeholder="Share your experience with this landlord and property." />
                </label>
                <button type="button" onClick={submitReview} style={secondaryButtonStyle}>Submit review</button>
              </>
            ) : (
              <p style={helperTextStyle}>Only tenants who requested/booked this seat can submit reviews.</p>
            )}
          </article>
        </aside>
      </section>

      {canReviewApplications && (
        <section style={{ ...panelStyle, marginTop: '16px' }}>
          <h2 style={panelTitleStyle}>Seat requests</h2>
          <p style={helperTextStyle}>Landlord decision panel. Admin cannot approve or reject these requests.</p>
          {(property.seatApplications || []).length > 0 ? property.seatApplications.map((application) => (
            <div key={application._id} style={applicationRowStyle}>
              <div>
                <strong>{application.tenantName}</strong>
                <p style={helperTextStyle}>{application.studentIdType} · {application.roommateRequest ? 'Roommate request' : 'Seat request'} · {application.seatsRequested || 1} seat(s) · {application.status}</p>
              </div>
              <div style={actionRowStyle}>
                <button type="button" onClick={() => reviewApplication(application._id, 'Approved')} style={approveButtonStyle}>Approve</button>
                <button type="button" onClick={() => reviewApplication(application._id, 'Rejected')} style={rejectButtonStyle}>Reject</button>
              </div>
            </div>
          )) : <p style={bodyTextStyle}>No applications yet.</p>}
        </section>
      )}

      <div style={footerRowStyle}>
        <button onClick={() => navigate('/properties')} style={backButtonStyle}>&larr; Back to listings</button>
      </div>
    </div>
  );
};

const pageStyle = { maxWidth: '1200px', margin: '0 auto', padding: '36px 20px 72px', color: '#f6f1e8' };
const heroStyle = { display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'end' };
const eyebrowStyle = { color: '#ffd166', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem' };
const titleStyle = { fontSize: 'clamp(2rem, 4vw, 3.4rem)', margin: '10px 0 8px' };
const subtleTextStyle = { margin: 0, color: 'rgba(246,241,232,0.72)' };
const rentCardStyle = { padding: '20px 24px', borderRadius: '20px', background: 'linear-gradient(180deg, rgba(255,209,102,0.12) 0%, rgba(255,255,255,0.04) 100%)', border: '1px solid rgba(255,255,255,0.08)', minWidth: '220px' };
const rentValueStyle = { fontSize: '2.2rem', fontWeight: 800 };
const rentLabelStyle = { color: 'rgba(255,255,255,0.7)' };
const seatCountStyle = { marginTop: '10px', color: '#ffd166', fontWeight: 700 };
const galleryStyle = { marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' };
const photoStyle = { width: '100%', height: '220px', objectFit: 'cover', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)' };
const mapHeroStyle = { marginTop: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const sectionHeaderRowStyle = { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' };
const contentGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)', gap: '16px', marginTop: '20px' };
const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const panelTitleStyle = { marginTop: 0, marginBottom: '12px' };
const detailLineStyle = { margin: '10px 0', color: 'rgba(255,255,255,0.78)' };
const chipRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' };
const chipStyle = { padding: '8px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.82)', fontSize: '0.88rem' };
const rulesGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' };
const ruleCardStyle = { padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' };
const sectionBlockStyle = { marginTop: '18px' };
const bodyTextStyle = { color: 'rgba(255,255,255,0.72)' };
const mapFrameHeroStyle = { width: '100%', height: '420px', border: '0', borderRadius: '16px' };
const mapLinkStyle = { color: '#ffd166', fontWeight: 700, textDecoration: 'none' };
const sideStackStyle = { display: 'grid', gap: '16px' };
const fieldStyle = { display: 'grid', gap: '8px', marginTop: '12px', color: 'rgba(255,255,255,0.82)' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const checkboxStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', color: 'rgba(255,255,255,0.82)' };
const primaryButtonStyle = { marginTop: '16px', width: '100%', border: '0', borderRadius: '999px', padding: '12px 16px', fontWeight: 800, background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b' };
const secondaryButtonStyle = { marginTop: '16px', width: '100%', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '12px 16px', fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: '#f6f1e8' };
const helperTextStyle = { color: 'rgba(255,255,255,0.62)', marginTop: '8px', fontSize: '0.9rem' };
const chatHistoryStyle = { display: 'grid', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' };
const badgeStyle = { marginLeft: '8px', fontSize: '0.76rem', background: 'rgba(255,209,102,0.18)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.45)', borderRadius: '999px', padding: '4px 8px', verticalAlign: 'middle' };
const typingTextStyle = { marginTop: '10px', marginBottom: '0', color: 'rgba(255,209,102,0.9)', fontSize: '0.86rem', minHeight: '1.2rem' };
const chatBubbleStyle = (isOwnMessage) => ({
  padding: '10px 12px',
  borderRadius: '12px',
  background: isOwnMessage ? 'rgba(255, 209, 102, 0.16)' : 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
});
const chatSenderStyle = { fontSize: '0.8rem', color: '#ffd166', marginBottom: '4px' };
const chatMessageStyle = { color: '#f6f1e8', whiteSpace: 'pre-wrap' };
const chatTimeStyle = { marginTop: '4px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' };
const applicationRowStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center' };
const actionRowStyle = { display: 'flex', gap: '10px', flexWrap: 'wrap' };
const approveButtonStyle = { border: '0', padding: '10px 14px', borderRadius: '999px', background: 'rgba(56,161,105,0.2)', color: '#8ff0b4', fontWeight: 700 };
const rejectButtonStyle = { border: '0', padding: '10px 14px', borderRadius: '999px', background: 'rgba(229,62,62,0.2)', color: '#ff9b9b', fontWeight: 700 };
const contactLinkStyle = { display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.15)', color: '#ffd166', textDecoration: 'none', fontWeight: 700 };
const reportLinkStyle = { display: 'inline-flex', marginTop: '12px', padding: '10px 14px', borderRadius: '999px', background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b', textDecoration: 'none', fontWeight: 800 };
const paymentStatusCardStyle = { marginTop: '10px', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)' };
const paymentJourneyStyle = { marginTop: '10px', display: 'grid', gap: '8px' };
const paymentStepStyle = (done) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '10px',
  border: done ? '1px solid rgba(56,161,105,0.55)' : '1px solid rgba(255,255,255,0.12)',
  background: done ? 'rgba(56,161,105,0.18)' : 'rgba(255,255,255,0.03)',
  color: done ? '#a7f3c3' : 'rgba(255,255,255,0.78)',
  fontSize: '0.88rem',
});
const paymentStepIndexStyle = (done) => ({
  width: '18px',
  height: '18px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: done ? '#0f2a1c' : '#f6f1e8',
  background: done ? '#8ff0b4' : 'rgba(255,255,255,0.2)',
});
const footerRowStyle = { marginTop: '18px', display: 'flex', justifyContent: 'start' };
const backButtonStyle = { border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#f6f1e8', borderRadius: '999px', padding: '10px 14px', fontWeight: 700 };
const stateStyle = { minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#fff7e6' };

export default PropertyDetailsPage;