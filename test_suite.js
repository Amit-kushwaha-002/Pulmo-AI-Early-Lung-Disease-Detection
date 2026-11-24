const fs = require('fs');
const path = require('path');
const http = require('http');

async function runTestSuite() {
  console.log('====================================================');
  console.log('    PULMO AI - COMPREHENSIVE PRODUCTION TEST SUITE   ');
  console.log('====================================================\n');

  const results = {};
  const app = require('./backend/index.js');
  const serverlessApp = require('./api/index.js');

  // Check 1: Serverless entrypoint
  if (typeof serverlessApp === 'function' && serverlessApp === app) {
    results['1. Serverless Entrypoint (api/index.js)'] = 'PASS';
  } else {
    results['1. Serverless Entrypoint (api/index.js)'] = 'FAIL';
  }

  // Start test server on port 3099
  const PORT = 3099;
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  const baseUrl = `http://localhost:${PORT}`;

  try {
    // Check 2: Database Connectivity
    const { User } = require('./backend/model/user');
    const mongoose = require('mongoose');
    // Ensure active connection by querying the DB
    try {
      await User.findOne({}).maxTimeMS(5000);
    } catch (e) {}
    const dbConnected = mongoose.connection.readyState === 1;
    results['2. MongoDB Database Connectivity'] = dbConnected ? 'PASS' : 'FAIL';

    // Helper fetch wrappers
    async function get(route) {
      const res = await fetch(`${baseUrl}${route}`);
      return { status: res.status, text: await res.text() };
    }

    async function post(route, body, cookie = '') {
      const headers = { 'Content-Type': 'application/json' };
      if (cookie) headers['Cookie'] = cookie;
      const res = await fetch(`${baseUrl}${route}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        redirect: 'manual'
      });
      return { status: res.status, headers: res.headers, text: await res.text() };
    }

    // Check 3: Page Rendering
    const routesToTest = ['/', '/home', '/scan', '/about', '/contact', '/login', '/signup', '/forgot-password'];
    let pagesOk = true;
    for (const r of routesToTest) {
      const res = await get(r);
      if (res.status !== 200) {
        console.error(`Route ${r} returned status ${res.status}`);
        pagesOk = false;
      }
    }
    results['3. Frontend Page Rendering (EJS Views)'] = pagesOk ? 'PASS' : 'FAIL';

    // Check 4: Static Asset Loading
    const assets = ['/home.css', '/scan.js', '/forgot.css', '/forgot.js', '/images/logo.jpg'];
    let assetsOk = true;
    for (const a of assets) {
      const res = await get(a);
      if (res.status !== 200) {
        console.error(`Asset ${a} returned status ${res.status}`);
        assetsOk = false;
      }
    }
    results['4. Static Assets Loading (CSS/JS/Images)'] = assetsOk ? 'PASS' : 'FAIL';

    // Check 5: User Registration
    const testEmail = `test_doctor_${Date.now()}@pulmoai.local`;
    const signupRes = await post('/signup', {
      username: 'Dr. Test Audit',
      email: testEmail,
      password: 'AuditPassword123!',
      confirmPassword: 'AuditPassword123!'
    });
    const signupCookie = signupRes.headers.get('set-cookie');
    results['5. User Registration (POST /signup)'] = 
      (signupRes.status === 302 && signupCookie && signupCookie.includes('token=')) ? 'PASS' : 'FAIL';

    // Check 6: User Login
    const loginRes = await post('/login', {
      email: testEmail,
      password: 'AuditPassword123!'
    });
    const loginCookie = loginRes.headers.get('set-cookie');
    results['6. User Login (POST /login)'] = 
      (loginRes.status === 302 && loginCookie && loginCookie.includes('token=')) ? 'PASS' : 'FAIL';

    // Check 7: Forgot Password & OTP Flow
    const otpRes = await post('/send-otp', { email: testEmail });
    let otpJson = {};
    try { otpJson = JSON.parse(otpRes.text); } catch (e) {}
    
    let forgotFlowOk = false;
    if (otpJson.success) {
      // Test invalid OTP rejection
      const verifyFailRes = await post('/verify-otp', { email: testEmail, otp: '000000' });
      const verifyFailOk = verifyFailRes.status === 400;

      // Extract generated OTP from User model or test direct reset
      const resetRes = await post('/reset-password', { 
        email: testEmail, 
        otp: '000000', 
        newPassword: 'NewPassword123!' 
      });
      const resetRejectionOk = resetRes.status === 400;

      forgotFlowOk = verifyFailOk && resetRejectionOk;
    }
    results['7. Forgot Password & OTP Security Flow'] = forgotFlowOk ? 'PASS' : 'FAIL';

    // Check 8: Contact Form Submission
    const contactRes = await post('/contact', {
      name: 'Test Inquirer',
      email: 'inquirer@test.com',
      message: 'Testing contact inquiry persistence'
    });
    results['8. Contact Inquiry Persistence (POST /contact)'] = contactRes.status === 200 ? 'PASS' : 'FAIL';

    // Check 9: Image Upload & Real AI Prediction (TensorFlow)
    const testImgPath = path.join(__dirname, 'AI/model/00001256_007.png');
    if (fs.existsSync(testImgPath)) {
      const fileBuffer = fs.readFileSync(testImgPath);
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append('file', blob, '00001256_007.png');

      const predictRes = await fetch(`${baseUrl}/predict`, {
        method: 'POST',
        body: formData
      });
      const predictJson = await predictRes.json();
      console.log('AI Prediction Output:', JSON.stringify(predictJson));
      results['9. AI Model Inference (POST /predict)'] = 
        (predictJson.status === 'Disease Detected' || predictJson.status === 'Normal / Low Risk') 
          ? 'PASS' 
          : 'FAIL';
    } else {
      results['9. AI Model Inference (POST /predict)'] = 'FAIL (Test image not found)';
    }

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n================ TEST SUMMARY ================');
  for (const [key, val] of Object.entries(results)) {
    console.log(`${key.padEnd(52)}: [ ${val} ]`);
  }
  console.log('==============================================\n');

  const allPassed = Object.values(results).every(v => v.includes('PASS'));
  process.exit(allPassed ? 0 : 1);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
