# StockPilot – Smart Inventory & Order Management System

A full-stack inventory and order management system built for the Codebxo Full Stack Developer Internship assessment.

StockPilot includes a responsive web application, a native Android application, and a REST API connected to a shared MongoDB database.

## Project Links

- **Live Web App:** https://stock-pilot-3d5ivv6ll-stock-pilot8.vercel.app
- **Backend API:** https://stockpilot-gtj7.onrender.com
- **API Documentation:** https://stockpilot-gtj7.onrender.com/api/docs
- **Android APK:** [Download APK](YOUR-APK-LINK)
- **GitHub Repository:** https://github.com/Binshad1/StockPilot

## Features

- User authentication with role-based access
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
| View dashboard | ✓ | ✓ |
| Manage inventory | ✓ | ✓ |
| Manage customers | ✓ | ✓ |
| Create and manage orders | ✓ | ✓ |
| Manage products | ✓ | — |
| Access reports | ✓ | — |
| Manage users | ✓ | — |

## Project Structure

```text
StockPilot/
├── backend/       Node.js REST API
├── frontend/      React web application
├── android/       Kotlin Android application
├── docs/          Project documentation
└── render.yaml    Backend deployment configuration
```

## Run Locally

### Backend

```bash
cd backend
npm install
```

Configure your `.env` file with MongoDB connection details and JWT secret.

```bash
npm run dev
```

Backend runs at `http://localhost:5000`.

API documentation: `http://localhost:5000/api/docs`

### Web Application

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Android Application

1. Open the `android/` folder in Android Studio.
2. Configure the API URL in `gradle.properties`.
3. Sync Gradle.
4. Run the application on an emulator or Android device.

## Security

- Passwords are hashed using bcrypt.
- Authentication uses JWT.
- API requests are validated.
- Role-based permissions are enforced on the backend.
- Environment variables are used for sensitive configuration.

## Developer

**Binshad PT**

GitHub: https://github.com/Binshad1/StockPilot

Developed as part of the Codebxo Full Stack Developer Internship assessment.