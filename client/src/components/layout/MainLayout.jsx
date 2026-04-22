// src/components/layout/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MainLayout = () => {
 return (
  <>
   <Navbar />
   <main style={{ paddingTop: 'var(--navbar-height)' }}>
    <Outlet /> {/* Child routes will render here */}
   </main>
   <ToastContainer
    position="top-center"
    autoClose={5000}
    hideProgressBar={false}
    newestOnTop={false}
    closeOnClick
    rtl={false}
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="dark"
   />
   {/* <Footer /> */}
  </>
 );
};
export default MainLayout;