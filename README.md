# Lung Disease Detection System : PULMOAI

A full-stack web application that predicts lung diseases from chest X-ray images using a Machine Learning model, combined with a modern web interface for easy interaction.

## About the Project
Lung diseases like pneumonia, tuberculosis, and COVID-19 are often diagnosed through X-ray analysis, which usually requires expert radiologists and can take time. This project aims to simplify and speed up that process by using a Machine Learning model that can analyze chest X-ray images and predict potential lung diseases within seconds.

The system is built as a complete web application — users can simply upload an X-ray image through the website, and the backend processes it using a trained ML model to return a prediction. This project combines web development and machine learning to create a practical, real-world healthcare-assistive tool.

It was built to explore how AI can be integrated into everyday web applications and to understand the full pipeline of a real ML-based project — from data preprocessing and model training to deploying it inside a functional website.

## Overview
Users can upload a chest X-ray image, and the system analyzes it using a trained ML model to detect potential lung diseases, providing quick and accessible preliminary results.

## Tech Stack
**Frontend**
- HTML, CSS, JavaScript
- React.js
- EJS (for server-rendered views)

**Backend**
- Node.js
- Express.js
- MongoDB (database)

**Machine Learning**
- Python
- Data preprocessing & Model training
- opencv pyplot matplotlib numpy etc.
  
## Features
- Upload chest X-ray images
- ML model analyzes and predicts lung disease
- Displays results on the web interface
- User-friendly and responsive UI

## How It Works
1. User uploads an X-ray image via the web app
2. Image is sent to the backend / ML model for processing
3. Model predicts the disease based on trained data
4. Result is displayed to the user
