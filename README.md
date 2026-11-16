# StockPilot – Smart Inventory & Order Management System

<<<<<<< HEAD
A full-stack inventory and order management system built for the Codebxo Full Stack Developer Internship assessment.

StockPilot provides a responsive web application, a native Android application, and a REST API connected to a shared MongoDB database.

## Project Links

- **Live Web Application:** https://stock-pilot-3d5ivv6ll-stock-pilot8.vercel.app
- **Backend API:** https://stockpilot-gtj7.onrender.com
- **API Documentation:** https://stockpilot-gtj7.onrender.com/api/docs
- **Android APK:** (https://github.com/Binshad1/StockPilot/releases/download/v1.0.0/app-debug.apk)
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d
- **GitHub Repository:** https://github.com/Binshad1/StockPilot

## Features

<<<<<<< HEAD
- User authentication with role-based access
=======
- Authentication with role-based access control
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d
- Dashboard with inventory and sales overview
- Product management
- Inventory tracking and stock movement
- Low-stock monitoring
- Customer management
- Order creation and management
- Automatic stock updates during order processing
- Sales and inventory reports
- Responsive web interface
- Native Android application

## Technologies Used

| Component | Technologies |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| Validation | Zod |
| Android | Kotlin, XML, Retrofit |
| Deployment | Vercel, Render, MongoDB Atlas |

## User Roles

| Feature | Admin | Staff |
|---|:---:|:---:|
<<<<<<< HEAD
| View dashboard | ✓ | ✓ |
| Manage inventory | ✓ | ✓ |
| Manage customers | ✓ | ✓ |
| Create and manage orders | ✓ | ✓ |
| Manage products | ✓ | — |
| Access reports | ✓ | — |
| Manage users | ✓ | — |
=======
| Dashboard access | ✓ | ✓ |
| Inventory management | ✓ | ✓ |
| Customer management | ✓ | ✓ |
| Order management | ✓ | ✓ |
| Product management | ✓ | — |
| Reports | ✓ | — |
| User management | ✓ | — |
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d

## Project Structure

```text
StockPilot/
├── backend/       Node.js REST API
├── frontend/      React web application
├── android/       Kotlin Android application
<<<<<<< HEAD
├── docs/          Project documentation
└── render.yaml    Backend deployment configuration
```

## Run Locally
=======
├├── docs/          Project documentation
└── render.yaml    Backend deployment configuration
```

## Installation & Setup
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d

### Backend

```bash
cd backend
npm install
```

<<<<<<< HEAD
Configure your `.env` file with MongoDB connection details and JWT secret.
=======
Configure the `.env` file with your MongoDB connection string and JWT secret.
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d

```bash
npm run dev
```

<<<<<<< HEAD
Backend runs at `http://localhost:5000`.

API documentation: `http://localhost:5000/api/docs`
=======
Backend: http://localhost:5000

API Documentation: http://localhost:5000/api/docs
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d

### Web Application

```bash
cd frontend
npm install
npm run dev
```

<<<<<<< HEAD
Frontend runs at `http://localhost:5173`.
=======
Frontend: http://localhost:5173
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d

### Android Application

1. Open the `android/` folder in Android Studio.
2. Configure the API URL in `gradle.properties`.
3. Sync Gradle.
<<<<<<< HEAD
4. Run the application on an emulator or Android device.
=======
4. Run the application or build an APK.
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d

## Security

- Passwords are hashed using bcrypt.
<<<<<<< HEAD
- Authentication uses JWT.
- API requests are validated.
- Role-based permissions are enforced on the backend.
- Environment variables are used for sensitive configuration.
=======
- Authentication is implemented using JWT.
- API inputs are validated.
- Role-based permissions are enforced on the backend.
- Sensitive configuration is managed through environment variables.
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d

## Developer

**Binshad PT**

<<<<<<< HEAD
GitHub: https://github.com/Binshad1/StockPilot

Developed as part of the Codebxo Full Stack Developer Internship assessment.
=======
GitHub: https://github.com/Binshad1

Developed as part of the Codebxo Full Stack Developer Internship Assessment.
>>>>>>> 2132303dd2d694bbc847e90b9bc8a3e7a180b65d
