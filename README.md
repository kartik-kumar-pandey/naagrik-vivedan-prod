# Naagrik Nivedan 🏙️📢

**Naagrik Nivedan** is a modern, AI-powered civic issue reporting platform designed to bridge the gap between citizens and municipal authorities. It empowers users to report civic issues (like potholes, garbage, fallen trees) by simply uploading a photo. The system uses advanced computer vision to classify the issue, automatically generates a formal complaint letter, and tracks the resolution process in real-time.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Key Features

*   **📸 AI-Powered Issue Classification**:
    *   Uses a custom-trained **MobileNetV3** model with **CBAM** (Convolutional Block Attention Module) attention mechanism.
    *   Automatically detects 6 types of civic issues: `Potholes`, `Garbage`, `Fallen Trees`, `Damaged Signs`, `Graffiti`, and `Illegal Parking`.
    *   High accuracy inference via a dedicated FastAPI microservice (Hugging Face Spaces compatible).

*   **📝 Automated Formal Complaints**:
    *   Generates professional, detailed complaint letters addressed to the specific municipal department.
    *   Includes precise location data (address + GPS coordinates), priority assessment, and safety impact analysis.
    *   Template-based generation ensures consistency and formality.

*   **📍 Geospatial Tracking & Visualization**:
    *   **Interactive Map**: View all reported issues on a map with clustering for better visibility.
    *   **Heatmaps**: Visualize high-density problem areas to help authorities prioritize resources.
    *   **Real-time Updates**: Powered by Firebase Realtime Database.

*   **🔐 Secure & User-Friendly**:
    *   Authentication via **Clerk**.
    *   Responsive design built with **React**, **Tailwind CSS**, and **GSAP** animations.
    *   Cross-platform compatibility (Desktop & Mobile).

## 🏗️ Architecture

The project follows a microservices-inspired architecture:

1.  **Frontend (`/frontend`)**:
    *   **Framework**: React (Vite)
    *   **Styling**: Tailwind CSS
    *   **Maps**: Leaflet / React-Leaflet
    *   **State/Auth**: Clerk, Axios

2.  **Backend (`/backend`)**:
    *   **Framework**: Flask (Python)
    *   **Database**: Firebase Realtime Database (via Admin SDK)
    *   **AI Integration**: Google Gemini (for enhanced descriptions), Geopy (Reverse Geocoding)

3.  **AI Classifier (`/hf-classifier`)**:
    *   **Framework**: FastAPI
    *   **Model**: PyTorch (MobileNetV3 + CBAM)
    *   **Deployment**: Designed for Hugging Face Spaces or standalone Docker container.

4.  **Shared (`/shared`)**:
    *   Contains shared model inference logic (`IssueClassifier`) used by both the backend and the classifier service.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   Python (v3.9+)
*   Firebase Project (Realtime Database enabled)
*   Clerk Account (for Auth)
*   Google Gemini API Key (optional, for enhanced text generation)

### 1. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Run the development server:
```bash
npm run dev
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
GEMINI_API_KEY=your_gemini_key
HF_CLASSIFIER_URL=http://localhost:7860/predict  # Or your HF Space URL
HF_CLASSIFIER_TOKEN=your_hf_token # If using private HF Space
```

> **Note**: You need to download your Firebase Service Account JSON file and place it in `backend/serviceAccountKey.json` or point `FIREBASE_SERVICE_ACCOUNT_PATH` to it.

Run the backend:
```bash
python app.py
```

### 3. AI Classifier Setup (Optional)

If you want to run the classifier locally instead of using the hosted HF Space:

```bash
cd hf-classifier
pip install -r requirements.txt
```

Run the FastAPI server:
```bash
uvicorn app:app --reload --port 7860
```

## 🔌 API Endpoints

### Backend (`http://localhost:5000`)

*   `POST /api/submit-complaint`: Submit a new complaint (image, location, description).
*   `GET /api/track-complaint/<id>`: Get status of a specific complaint.
*   `GET /api/complaints-map`: Get complaints within a radius (lat, lon, radius).
*   `GET /api/heatmap-data`: Get data for heatmap visualization.

### Classifier (`http://localhost:7860`)

*   `POST /predict`: Accepts a base64 image and returns the predicted issue type and confidence.

## 🧠 Model Details

The core of the issue detection is a **MobileNetV3-Small** model enhanced with **CBAM**.
*   **Input**: 224x224 RGB Images.
*   **Output**: 6 Classes.
*   **Performance**: Optimized for low-latency inference on CPU (ideal for free-tier cloud hosting).

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
