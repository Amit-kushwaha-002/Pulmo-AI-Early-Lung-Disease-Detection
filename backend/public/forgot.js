// SEND OTP
async function sendOTP() {
   const emailInput = document.getElementById("email");
   const email = emailInput.value.trim();

   if (!email) {
      alert("Please enter your registered email address.");
      return;
   }

   const btn = document.getElementById("sendOtpBtn");
   btn.disabled = true;
   btn.innerText = "Sending...";

   try {
      const res = await fetch('/send-otp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.success) {
         alert("OTP sent to your email (or check terminal for local testing)!");
         document.getElementById("otpSection").style.display = "block";
         btn.innerText = "Resend OTP";
      } else {
         alert("Error: " + (data.message || "Failed to send OTP"));
         btn.innerText = "Send OTP";
      }
   } catch (err) {
      alert("Network error: " + err.message);
      btn.innerText = "Send OTP";
   } finally {
      btn.disabled = false;
   }
}

// VERIFY OTP
async function verifyOTP() {
   const email = document.getElementById("email").value.trim();
   const enteredOTP = document.getElementById("otp").value.trim();

   if (!enteredOTP) {
      alert("Please enter the 6-digit OTP.");
      return;
   }

   try {
      const res = await fetch('/verify-otp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, otp: enteredOTP })
      });

      const data = await res.json();
      if (data.success) {
         alert("OTP Verified Successfully! Please enter your new password.");
         document.getElementById("resetSection").style.display = "block";
      } else {
         alert("Invalid or expired OTP: " + (data.message || "Please try again."));
      }
   } catch (err) {
      alert("Verification error: " + err.message);
   }
}

// RESET PASSWORD
async function resetPassword() {
   const email = document.getElementById("email").value.trim();
   const enteredOTP = document.getElementById("otp").value.trim();
   const pass1 = document.getElementById("newPassword").value;
   const pass2 = document.getElementById("confirmPassword").value;

   if (pass1.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
   }

   if (pass1 !== pass2) {
      alert("Passwords do not match.");
      return;
   }

   try {
      const res = await fetch('/reset-password', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            email,
            otp: enteredOTP,
            newPassword: pass1
         })
      });

      const data = await res.json();

      if (data.success) {
         alert("Password Reset Successful! Redirecting to login page...");
         window.location.href = "/login";
      } else {
         alert("Reset Failed: " + (data.message || "An error occurred."));
      }
   } catch (err) {
      alert("Error resetting password: " + err.message);
   }
}
