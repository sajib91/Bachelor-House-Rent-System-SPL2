# To-Let Globe Frontend Application

**Version: 1.0.0**
**Last Updated: June 10, 2025**
**Primary Technologies: React.js, JavaScript, Vite, React Router, Axios, React Hook Form**
**UI Design: Modern dark theme with distinctive cyan/gold gradient accents.**

---

### 📄 Table of Contents

* [1. Project Overview](#1-project-overview)
* [2. Features](#2-features)
* [3. Tech Stack & Key Libraries](#3-tech-stack--key-libraries)
* [4. Design Philosophy](#4-design-philosophy)
* [5. Live Demo](#5-live-demo)
* [6. Prerequisites](#6-prerequisites)
* [7. Getting Started](#7-getting-started)
    * [Backend Setup (Important!)](#backend-setup-important)
    * [Frontend Setup](#frontend-setup)
* [8. Available Scripts](#8-available-scripts)
* [9. Environment Variables](#9-environment-variables)
* [10. Project Structure](#10-project-structure)
* [11. Key Components & Pages](#11-key-components--pages)
* [12. API Integration](#12-api-integration)
* [13. State Management](#13-state-management)
* [14. Routing](#14-routing)
* [15. Styling](#15-styling)
* [16. Form Handling & Validation](#16-form-handling--validation)
* [17. Code Quality](#17-code-quality)
* [18. Deployment](#18-deployment)
* [19. Troubleshooting](#19-troubleshooting)
* [20. Contributing](#20-contributing)
* [21. License](#21-license)
* [22. Author](#22-author)

---

### 1. Project Overview

This project is the **frontend application** for the To-Let Globe platform, providing a secure, intuitive, and user-friendly interface for property listings, user authentication, and content creation. It enables users to register, log in, verify their email, manage their passwords, and access protected dashboard areas. Additionally, it includes a dedicated contact form for direct communication with administrators and a module for content creators to publish blog posts.Also present is a comprehensive property feature, allowing users to browse listings, and landlords to add and manage their properties.

Built with **React (JavaScript)** and **Vite**, this frontend is designed for seamless integration with its corresponding Node.js/Express.js backend API. The UI follows a modern dark theme, highlighted by distinct cyan and gold gradient accents, consistent with the overall project branding.

---

### 2. Features

#### User Authentication & Authorization:
* Secure **User Registration** with role selection.
* **User Login** with email/username and password.
* **JWT-based session management** (`localStorage`).
* **Email Verification** flow to activate user accounts.
* **Forgot Password** and **Reset Password** functionality for account recovery.
* **Protected routes** and role-based content display (e.g., "Add Blog" access only for Content Creators).

#### User Interface & Experience:
* **User Dashboard** to display personalized profile information.
* **Contact Form:** Dedicated page for users to send inquiries, feedback, or support requests, with confirmation messages.
* **Blog Module:** View existing blog posts and (for authorized users) create new ones with a rich text editor.
* **Responsive Design:** Optimized for optimal viewing across various devices (desktops, tablets, mobile phones).
* User-friendly notifications for actions and errors (React Toastify).
* Consistent UI/UX based on the "To-Let Globe" design samples.

#### Property Management:
* **Property Listing Display:** Browse and view detailed property listings with high-quality images.
* **Property Search & Filtering:** Intuitive search bar and advanced filters (location, price range, property type, amenities) to help users find ideal properties.
* **Add New Property:** Dedicated forms for landlords to easily list new properties, including details and image uploads.
* **Manage My Properties:** Dashboard section for landlords to view, edit, and delete their own property listings.
* **Property Detail Pages:** Comprehensive pages for individual properties, showcasing all relevant information, image galleries, and contact options.

---

### 3. Tech Stack & Key Libraries

* **Core:** React.js (v18+), JavaScript (ES6+)
* **Build Tool:** Vite
* **Routing:** React Router DOM (v6+)
* **API Client:** Axios
* **Form Management:** React Hook Form
* **State Management:** React Context API (for global authentication state)
* **UI Notifications:** React Toastify
* **Icons:** React Icons
* **Rich Text Editor:** React Quill
* **Image Carousel/Gallery:** (e.g., `react-responsive-carousel` or custom implementation for property images)
* **Styling:** CSS Modules, Global CSS with Variables
* **Code Quality:** ESLint, Prettier

---

### 4. Design Philosophy

The UI design is directly inspired by the provided "To-Let Globe" design samples, particularly the login screen and overall branding:

* **Theme:** Dark mode serves as the primary aesthetic, providing a sleek and modern look.
* **Accent Colors:** A distinctive gradient border and key interactive elements (buttons, active states) utilize a vibrant combination of **cyan (`#22d3ee`)** and **gold (`#f5b920`)**, creating visual interest and guiding user attention.
* **Typography:** Clean, modern sans-serif fonts (e.g., Poppins) ensure excellent readability across all components.
* **Layout:** Authentication forms feature centered content with clear structure. The overall application maintains a responsive, adaptive layout for various screen sizes.
* **Consistency:** Design elements such as inputs, buttons, links, and cards are consistently applied across all authentication and main application pages to ensure a cohesive and intuitive user experience.

---

### 5. Live Demo

Explore the live frontend application:
* **Frontend:** [https://to-let-globe-rho.vercel.app/](https://to-let-globe-rho.vercel.app/) 

---

### 6. Prerequisites

Before setting up the frontend, ensure you have:

* **Node.js** (v18.x or later recommended, includes npm).
* A modern web browser (Chrome, Firefox, Edge, Safari).
* **The corresponding To-Let Globe Backend API must be running and accessible.** For local development, this typically means the backend server should be running on `http://localhost:5001`. For deployed versions, ensure you have the correct API base URL.

---

### 7. Getting Started

### Backend Setup (Important!)
The frontend relies entirely on the backend API for data. **Before running the frontend, ensure the backend server is running and accessible.**

Please refer to the main [To-Let Globe Monorepo README](../README.md) or the dedicated [Server README](../server/README.md) for detailed server setup and running instructions.

### Frontend Setup

1.  **Navigate to the client directory:**
    If you've cloned the monorepo, move into the `client` folder:

    ```bash
    cd to-let-globe/client
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    Open the newly created `.env` file in the frontend root and set the `VITE_API_BASE_URL` to point to your running backend API.
    * **Local Backend Example:** `VITE_API_BASE_URL=http://localhost:5001/api`
    * **Deployed Backend Example:** `VITE_API_BASE_URL=https://to-let-globe-backend.onrender.com/api` (replace with your actual Render URL)

4.  **Run the development server:**

    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:5173` in your web browser.

---

### 8. Available Scripts

In the frontend project directory, you can run the following npm scripts:

* `npm run dev`: Starts the development server with Hot Module Replacement (HMR) for rapid development.
* `npm run build`: Compiles and optimizes the application for production into the `dist` folder.
* `npm run lint`: Runs ESLint to check for code quality and style issues, ensuring adherence to coding standards.
* `npm run format`: Formats the code using Prettier, maintaining consistent code style across the project.
* `npm run preview`: Serves the production build locally for testing purposes before deployment.
* `npm test`: (If configured with Vitest/Jest) Executes the test suite for frontend components and logic.

---

### 9. Environment Variables

Create a `.env` file in the frontend root based on `.env.example`. All environment variables exposed to the client-side by Vite must be prefixed with `VITE_`.

* **`VITE_API_BASE_URL`**: **Required.** The base URL for the backend API.
    * Example for local development: `VITE_API_BASE_URL=http://localhost:5001/api`
    * Example for deployed backend: `VITE_API_BASE_URL=https://your-backend-app.onrender.com/api`

---

### 10. Project Structure

```

client/
├── public/                 # Static assets (e.g., favicons, manifest.json)
├── src/
│   ├── assets/             # Images, custom SVGs, fonts
│   ├── components/
│   │   ├── common/         # Reusable basic UI elements (Button, InputField, etc.)
│   │   ├── layout/         # Layout components (Navbar, MainLayout, AuthLayout, ProtectedRoute)
│   │   ├── properties/     # New: Components specific to property listings (PropertyCard, PropertyForm, ImageGallery)
│   │   └── ui/             # Specific UI components (PasswordStrengthIndicator, BlogCard)
│   ├── contexts/           # React Context API providers (e.g., AuthContext) for global state
│   ├── hooks/              # Custom React hooks (e.g., useAuth)
│   ├── pages/              # Top-level page components
│   │   ├── Auth/           # Authentication-related pages (Login, Register, Forgot/Reset Password)
│   │   ├── Blogs/          # Blog-related pages (CreateBlogPage, BlogsListPage, BlogDetailPage)
│   │   ├── Dashboard/      # User dashboard pages
│   │   ├── Properties/     # New: Property-related pages (PropertiesListPage, PropertyDetailPage, CreatePropertyPage, EditPropertyPage)
│   │   ├── Status/         # Pages for verification/error status (e.g., VerifyEmailPage, UnauthorizedPage)
│   │   ├── ContactPage.jsx # Contact form page
│   │   └── HomePage.jsx    # Main landing page
│   ├── services/           # API integration logic (apiService, authService)
│   ├── styles/             # Global CSS, theme variables, CSS Modules
│   ├── App.jsx             # Main application component with routing setup
│   └── main.jsx            # Application entry point
├── .env                    # Local environment variables (Git ignored)
├── .env.example            # Template for environment variables
├── .eslintrc.cjs           # ESLint configuration
├── .gitignore
├── .prettierrc.json        # Prettier configuration
├── index.html              # Main HTML file for Vite
├── package.json            # Frontend dependencies and scripts
└── vite.config.js          # Vite build configuration

```

---

### 11. Key Components & Pages

* **`HomePage.jsx`**: The main landing page, incorporating sections like Welcome, Services, About Us, Our Mission, Hiring Partners, Top Locations, and Partnered Universities, consistent with the overall "To-Let Globe" design vision.
* **`LoginPage.jsx`**: Implements the exact UI provided in the design sample, featuring the distinctive gradient border form, input fields with icons, and styled links/buttons.
* **`RegisterPage.jsx`**: Extends the login page design for new user account creation.
* **`ForgotPasswordPage.jsx`** & **`ResetPasswordPage.jsx`**: Forms for password management, maintaining the established dark theme and gradient accent style.
* **`VerifyEmailPage.jsx`**: Handles the email verification token flow, displaying status to the user.
* **`DashboardPage.jsx`**: A protected route that displays authenticated user information, styled consistently.
* **`PropertiesListPage.jsx`**: **New.** Displays a grid or list of available property listings, with search and filtering controls.
* **`PropertyDetailPage.jsx`**: **New.** Shows detailed information for a single property, including an image gallery, description, features, and contact landlord options.
* **`CreatePropertyPage.jsx`**: **New.** A protected page for `Landlords` to input and submit new property listings, including uploading multiple images.
* **`EditPropertyPage.jsx`**: **New.** A protected page for `Landlords` to modify their existing property listings.
* **`ContactPage.jsx`**: A dedicated page containing the contact form, allowing users to send messages to administrators.
* **`BlogsListPage.jsx`**: Displays a list of all published blog posts.
* **`CreateBlogPage.jsx`**: A protected page for Content Creators to draft and submit new blog posts, featuring a rich text editor.
* **`BlogDetailPage.jsx`**: Displays the full content of a single blog post.
* **`Navbar.jsx`**: Top navigation bar that aligns with the sample UI's header elements and project branding, with conditional rendering based on authentication status and user roles.
* **`InputField.jsx`** & **`Button.jsx`**: Common, reusable UI components styled to match the design samples for consistent forms and actions across the application.
* **`AuthLayout.jsx`**: A layout component responsible for centering authentication forms and applying the distinctive gradient border theme around them.
* **`MainLayout.jsx`**: The primary application layout, which includes the Navbar and wraps most application pages.

---

### 12. API Integration

All communication with the backend API is centralized through `src/services/apiService.js` and `src/services/authService.js`.

* **`src/services/apiService.js`** configures an `axios` instance with:
    * `baseURL` dynamically set from `VITE_API_BASE_URL`.
    * A request interceptor to automatically attach the JWT (retrieved from `localStorage`) to the `Authorization` header for all authenticated requests.
    * A response interceptor to handle global errors (e.g., `401 Unauthorized` responses indicating session expiry, triggering an automatic logout and redirection to the login page).

---

### 13. State Management

* **Global Authentication State:** Managed efficiently using React's **Context API** (`src/contexts/AuthContext.jsx`). This context provides:
    * The `user` object (representing the currently authenticated user).
    * The `token` (JWT for API authentication).
    * An `isAuthenticated` boolean flag indicating login status.
    * An `isLoading` boolean flag (for the initial authentication check on app load).
    * `login()` and `logout()` methods to manage user sessions and update the global state.
* **Local Component State:** Handled using React's `useState` hook for managing form inputs (especially with React Hook Form), displaying component-specific error messages, and controlling UI toggles (e.g., loading states).

---

### 14. Routing

Client-side routing is powered by `react-router-dom`.

* Routes are comprehensively defined in `src/App.jsx`, utilizing lazy loading (`React.lazy` and `Suspense`) for page components to optimize initial load performance and bundle splitting.
* **`ProtectedRoute.jsx`**: A custom higher-order component that intelligently checks the authentication status (from `AuthContext`) and user role (if `allowedRoles` are specified) before granting access to a route. It redirects unauthenticated users to `/login` or unauthorized users to `/unauthorized` as needed, ensuring a secure and controlled user flow.

---

### 15. Styling

* **Global Styles:** Defined in `src/styles/theme.css` (for CSS variables managing colors, fonts, and spacing) and `src/styles/global.css` (for base HTML element styles and resets). These provide a consistent design system.
* **Component-Specific Styles:** **CSS Modules** (`*.module.css`) are utilized for scoping styles to individual components, effectively preventing class name collisions, enhancing modularity, and ensuring maintainability.
* **Design Consistency:** The overarching dark theme and the distinctive accent colors (cyan/gold gradient) from the design samples are applied consistently across the entire application and all components, creating a cohesive and branded user experience.

---

### 16. Form Handling & Validation

**React Hook Form** is the chosen library for all forms (Login, Register, Password Reset, Contact, Create Blog, etc.) due to its significant benefits in:

* **Optimized Performance:** Reduces re-renders and provides a smoother user experience.
* **Simplified API:** Easy and flexible for defining validation rules (required fields, pattern matching, custom validation functions).
* **Efficient State Management:** Streamlined management of form state (submission status, error messages, dirty fields).
* **Client-Side Validation:** Provides immediate feedback to the user, enhancing usability and reducing server load.
* **Server-Side Validation:** While client-side validation offers a good UX, the backend API performs the definitive server-side validation to ensure data integrity and security against malicious inputs.

---

### 17. Code Quality

* **ESLint:** Configured to enforce JavaScript coding standards and proactively identify potential errors and anti-patterns. The configuration is found in `.eslintrc.cjs`.
* **Prettier:** Ensures consistent code formatting across the entire codebase, eliminating style debates and improving readability. The configuration is in `.prettierrc.json`.

It is highly recommended to run `npm run lint` and `npm run format` regularly during development. Integrating these commands with your VS Code setup (e.g., format-on-save) is strongly encouraged for a streamlined development workflow.

---

### 18. Deployment

1.  **Build the application:**

    ```bash
    npm run build
    ```
    This command compiles and optimizes the React application using Vite, generating production-ready static assets within the `dist/` directory.

2.  **Deploy static assets:**
    The generated `dist/` folder can be deployed to any static site hosting service, such as:
    * Vercel (recommended, as configured in the monorepo root)
    * Netlify
    * GitHub Pages
    * AWS S3 + CloudFront
    * Firebase Hosting

3.  **SPA Routing Configuration:**
    Ensure your chosen hosting provider is configured to handle **Single Page Application (SPA) routing** correctly. This typically involves redirecting all paths that are not direct static file requests to `index.html`, allowing React Router to manage the client-side routes.
    * **Vercel:** Usually handles this automatically. If custom redirects are needed, they can be configured via a `vercel.json` file.
    * **Netlify:** Create a `public/_redirects` file with the rule: `/* /index.html 200`.

---

### 19. Troubleshooting

### API Connection Issues:
* Verify that the backend server is actively running and accessible at the `VITE_API_BASE_URL` defined in your `client/.env` file.
* Check your browser's developer console (Network tab) for any **Cross-Origin Resource Sharing (CORS)** errors. Ensure your backend's CORS configuration explicitly allows requests from your frontend's origin (e.g., `http://localhost:5173` for local development, or your deployed Vercel URL).

### Login/Registration Failures:
* Examine the browser console for network errors or specific error messages returned from the backend API.
* Verify that the data payloads sent from the frontend forms (in the Network tab of dev tools) exactly match the expectations of the backend API.
* Ensure that the backend database is connected and fully operational.

### Styling Discrepancies:
* Confirm that CSS Modules are imported correctly (e.g., `import styles from './MyComponent.module.css';`).
* Check for potential CSS specificity conflicts or typographical errors in class names.
* Utilize your browser's developer tools to inspect elements and trace the applied styles.

### Environment Variables Not Loading:
* Ensure that all frontend environment variables intended for client-side use are correctly prefixed with `VITE_`.
* Always restart the Vite development server (`npm run dev`) after making any changes to your `.env` files.

---

### 20. Contributing

Contributions are highly encouraged and welcome! Please follow these general guidelines to contribute to the project:

1.  **Fork the repository.**
2.  **Clone your forked repository** to your local machine.
3.  **Create a new feature branch** from `main` (or `develop` if applicable): `git checkout -b feature/your-feature-name`.
4.  **Make your changes**, ensuring they adhere to the existing code style and conventions.
5.  **Write tests** for any new functionality you introduce (if applicable, using Vitest/Jest and React Testing Library).
6.  **Ensure code quality:** Run `npm run lint` and `npm run format` to ensure your code passes checks and is consistently formatted.
7.  **Commit your changes** with a clear, descriptive, and [conventional commit message](https://www.conventionalcommits.org/en/v1.0.0/).
8.  **Push your branch** to your forked repository.
9.  **Open a Pull Request** from your feature branch to the `main` (or `develop`) branch of the original repository. Provide a detailed description of your changes and why they are necessary.

---

### 21. License

This project is licensed under the MIT License. See the `LICENSE` file in the monorepo root for full details.

---
