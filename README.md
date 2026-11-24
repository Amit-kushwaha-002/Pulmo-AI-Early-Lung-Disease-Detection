# Lung Disease Detection System : PULMOAI

A full-stack web application that predicts lung diseases from chest X-ray images using a Machine Learning model, combined with a modern web interface for easy interaction.

---

## Tech Stack
**Frontend**
- HTML5, CSS3, JavaScript
- EJS (Embedded JavaScript templates)

**Backend**
- Node.js & Express.js
- MongoDB & Mongoose
- Multer (Multipart image upload handling)
- JSON Web Token (JWT) & Bcrypt (Authentication)

**Machine Learning**
- Python 3.10+
- TensorFlow / Keras (CNN model `lung_model.h5`)
- NumPy, Pillow, OpenCV

---

## Local Setup & Development

### 1. Install Node.js Dependencies
From the project root:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root (see `.env.example`):
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/authtestapp
JWT_SECRET=your_jwt_secret_key_here
PYTHON_PATH=python
```

### 3. Start the Application
```bash
npm start
```
The app will be accessible at: `http://localhost:3000`

---

## Deployment to Vercel (vercel.app)

This repository is pre-configured for one-click deployment on [Vercel](https://vercel.com):

1. **Push to GitHub**:
   Ensure all changes are pushed to your `main` branch.

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **Add New...** -> **Project**.
   - Select your repository: `Amit-kushwaha-002/Pulmo-AI-Early-Lung-Disease-Detection`.
   - Keep the root directory as `./` (default).
   - Framework preset: `Other`.

3. **Configure Environment Variables in Vercel**:
   Add the following in your Vercel Project Settings -> **Environment Variables**:
   - `MONGO_URI`: Your MongoDB Atlas connection string (e.g., `mongodb+srv://<user>:<password>@cluster0.mongodb.net/pulmoai?retryWrites=true&w=majority`)
   - `JWT_SECRET`: A secure random string for JWT token generation.
   - *(Optional)* `AI_API_URL`: If hosting the Python TensorFlow model on a dedicated cloud service (like Render or Hugging Face Spaces), provide the prediction endpoint URL.

4. **Deploy**:
   - Click **Deploy**. Vercel will install dependencies and deploy the serverless Express application via `api/index.js` and `vercel.json`.

---

## Architecture

- **`api/index.js`**: Serverless function entrypoint for Vercel.
- **`vercel.json`**: Configures URL routing and includes view templates in serverless builds.
- **`backend/`**: Express application containing routes, models, views (EJS), and public assets.
- **`AI/model/`**: Trained deep learning model (`lung_model.h5`) and Python inference script (`predict.py`).
