# Firebase Email Customization Instructions

Since Firebase handles email sending from their own servers, you must update the styling manually in the **Firebase Console**.

### Steps to Apply Styling:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (**we3project-vision**).
3. Go to **Authentication** > **Templates**.
4. Select **Email address verification**.
5. Click the **Edit (pencil icon)** on the right.
6. Click **customize HTML** at the bottom.
7. Replace the content with the template provided below.
8. Repeat for **Password reset** if desired.

### Important: Set Custom Handler URL
To make the email link open your new custom `verify.html` page instead of the default Firebase page:
1. In the **Authentication** > **Templates** tab, look for the **Widget URL** section (usually at the bottom or behind a "gear" icon).
2. Change the URL to your hosted website's verify page, for example: `https://we3project-vision.firebaseapp.com/verify.html`.
3. Save the changes.

Now, whenever a user clicks the link in their email, they will see your professional custom page!

---

### Professional HTML Template
Copy and paste this into the "Message" body of the Firebase Console (after clicking customize HTML):

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #064e3b 0%, #10b981 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 40px 30px; line-height: 1.6; color: #374151; }
    .content h2 { margin-top: 0; color: #111827; font-size: 22px; }
    .button-wrap { text-align: center; margin: 30px 0; }
    .button { background-color: #10b981; color: white !important; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block; transition: background 0.3s; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Project Vision</h1>
    </div>
    <div class="content">
      <h2>Verify your identity</h2>
      <p>Hello,</p>
      <p>Thank you for joining <strong>Project Vision</strong>. We're excited to have you in our community focused on making a real impact.</p>
      <p>To finalize your account setup and start helping those in need, please click the button below to verify your email address:</p>
      <div class="button-wrap">
        <a href="%LINK%" class="button">Verify Email Address</a>
      </div>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>Best regards,<br>The Project Vision Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 FreeHunger / Project Vision</p>
      <p>Pakistan's Tech-Driven Humanitarian Platform</p>
    </div>
  </div>
</body>
</html>
```

*Note: Make sure `%LINK%` remains exactly as it is, as Firebase uses it to inject the actual verification URL.*
