// frontend/src/components/layout/Navbar.jsx
import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const styles = {
    navbar: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(18px)',
      background: 'rgba(8, 12, 18, 0.82)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    navContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    },
    logo: {
      color: '#fff7e6',
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontSize: '0.95rem',
    },
    menuToggle: {
      display: 'none',
      background: 'transparent',
      border: '0',
      padding: 0,
      gap: '4px',
      flexDirection: 'column',
    },
    menuLine: {
      width: '24px',
      height: '2px',
      borderRadius: '999px',
      background: '#ffffff',
      opacity: 0.8,
    },
    menuLineOpen: {
      width: '24px',
      height: '2px',
      borderRadius: '999px',
      background: '#ffd166',
    },
    navLinks: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
    },
    navLinksOpen: {
      display: 'flex',
    },
    navLink: {
      padding: '10px 14px',
      borderRadius: '999px',
      border: '1px solid transparent',
      textDecoration: 'none',
      transition: 'all 180ms ease',
      fontSize: '0.95rem',
    },
    logoutButton: {
      padding: '10px 14px',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.16)',
      background: 'linear-gradient(135deg, #f08a5d 0%, #ffd166 100%)',
      color: '#09111b',
      fontWeight: 700,
      cursor: 'pointer',
    },
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };


  const Logo = () => (
    <Link to="/" style={styles.logo}>
      BACHELOR HOUSE RENT SYSTEM
    </Link>
  );

  const linkStyle = ({ isActive }) => ({
    ...styles.navLink,
    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.75)',
    borderColor: isActive ? 'rgba(255, 208, 102, 0.45)' : 'transparent',
    background: isActive ? 'rgba(255, 208, 102, 0.12)' : 'transparent',
  });

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContainer}>
        <Logo />

        <button type="button" onClick={toggleMenu} style={styles.menuToggle} aria-label="Toggle navigation">
          <span style={menuOpen ? styles.menuLineOpen : styles.menuLine} />
          <span style={menuOpen ? styles.menuLineOpen : styles.menuLine} />
          <span style={menuOpen ? styles.menuLineOpen : styles.menuLine} />
        </button>

        <div style={{ ...styles.navLinks, ...(menuOpen ? styles.navLinksOpen : {}) }}>
          <NavLink to="/" style={linkStyle} onClick={toggleMenu}>
            Home
          </NavLink>
          <NavLink to="/properties" style={linkStyle} onClick={toggleMenu}>
            Listings
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" style={linkStyle} onClick={toggleMenu}>
              {user?.role === 'Admin' ? 'Admin Dashboard' : user?.role === 'Landlord' ? 'Landlord Dashboard' : 'Tenant Dashboard'}
            </NavLink>
          )}
          {isAuthenticated && user?.role === 'Landlord' && (
            <NavLink to="/add-property" style={linkStyle} onClick={toggleMenu}>
              Host a Seat
            </NavLink>
          )}
          {user?.role !== 'Admin' && (
            <NavLink to="/contact" style={linkStyle} onClick={toggleMenu}>
              Contact
            </NavLink>
          )}
          {isAuthenticated ? (
            <button type="button" onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          ) : (
            <NavLink to="/login" style={linkStyle} onClick={toggleMenu}>
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
