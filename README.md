# StockPilot – Smart Inventory & Order Management System

A full-stack inventory and order management system developed for the **Codebxo Full Stack Developer Internship Assessment**.

StockPilot provides a responsive web application, a native Android application, and a REST API connected to a shared MongoDB database.

## Project Links

- **Live Web Application:** https://stock-pilot-3d5ivv6ll-stock-pilot8.vercel.app
- **Backend API:** https://stockpilot-gtj7.onrender.com
- **API Documentation:** https://stockpilot-gtj7.onrender.com/api/docs
- **Android APK:** [Download StockPilot APK]([YOUR-APK-LINK](https://github.com/Binshad1/StockPilot/releases/download/v1.0.0/app-debug.apk))
- **GitHub Repository:** https://github.com/Binshad1/StockPilot

## Features

- Authentication with role-based access control
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
| Dashboard access | ✓ | ✓ |
| Inventory management | ✓ | ✓ |
| Customer management | ✓ | ✓ |
| Order management | ✓ | ✓ |
| Product management | ✓ | — |
| Reports | ✓ | — |
| User management | ✓ | — |

## Project Structure

```text
StockPilot/
├── backend/       Node.js REST API
├── frontend/      React web application
├── android/       Kotlin Android application
├├── docs/          Project documentation
└── render.yaml    Backend deployment configuration
```

## Installation & Setup

### Backend

```bash
cd backend
npm install
```

Configure the `.env` file with your MongoDB connection string and JWT secret.

```bash
npm run dev
```

Backend: http://localhost:5000

API Documentation: http://localhost:5000/api/docs

### Web Application

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

### Android Application

1. Open the `android/` folder in Android Studio.
2. Configure the API URL in `gradle.properties`.
3. Sync Gradle.
4. Run the application or build an APK.

## Security

- Passwords are hashed using bcrypt.
- Authentication is implemented using JWT.
- API inputs are validated.
- Role-based permissions are enforced on the backend.
- Sensitive configuration is managed through environment variables.

## Developer

**Binshad PT**

GitHub: https://github.com/Binshad1

Developed as part of the Codebxo Full Stack Developer Internship Assessment.
