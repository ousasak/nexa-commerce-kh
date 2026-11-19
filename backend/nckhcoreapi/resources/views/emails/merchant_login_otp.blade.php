<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sudo email verification code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Kantumruy Pro', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2328;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #ffffff;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .center-container {
      max-width: 480px;
      margin: 0 auto;
      text-align: center;
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      margin: 0 auto 16px auto;
      display: inline-block;
    }
    .page-title {
      font-size: 22px;
      font-weight: 600;
      color: #1f2328;
      margin: 0 0 24px 0;
      line-height: 1.35;
    }
    .page-title-sub {
      font-size: 14px;
      font-weight: 400;
      color: #656d76;
      margin-top: 4px;
      display: block;
    }
    .card-box {
      background-color: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 24px 28px;
      text-align: left;
      box-sizing: border-box;
    }
    .intro-text {
      font-size: 14px;
      color: #1f2328;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }
    .intro-subtext {
      font-size: 13px;
      color: #656d76;
      margin-top: 4px;
      display: block;
    }
    .code-display {
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
      font-size: 32px;
      font-weight: 600;
      letter-spacing: 6px;
      text-align: center;
      color: #1f2328;
      margin: 24px 0;
      padding: 8px 0;
      background-color: #f6f8fa;
      border-radius: 6px;
      user-select: all;
    }
    .info-text {
      font-size: 13px;
      color: #1f2328;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }
    .info-subtext {
      font-size: 12px;
      color: #656d76;
      margin-top: 2px;
      display: block;
    }
    .warning-text {
      font-size: 13px;
      font-weight: 600;
      color: #1f2328;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }
    .warning-subtext {
      font-size: 12px;
      font-weight: 400;
      color: #656d76;
      margin-top: 2px;
      display: block;
    }
    .signoff {
      font-size: 13px;
      color: #1f2328;
      line-height: 1.5;
      margin-top: 20px;
      border-top: 1px solid #f0f2f5;
      padding-top: 16px;
    }
    .signoff-sub {
      font-size: 12px;
      color: #656d76;
      margin-top: 2px;
    }
    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #8c959f;
      margin-top: 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="center-container">
      
      <!-- Top Brand Mark (Clean Modern Style) -->
      <div style="margin-bottom: 16px;">
        <svg class="brand-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" fill="#1f2328" stroke="#d0d7de" stroke-width="1"/>
          <path d="M9 13.5L16 8.5L23 13.5V15H9V13.5Z" fill="#ffffff"/>
          <path d="M10 16H12V22H10V16Z" fill="#ffffff"/>
          <path d="M15 16H17V22H15V16Z" fill="#ffffff"/>
          <path d="M20 16H22V22H20V16Z" fill="#ffffff"/>
          <path d="M9 22.5H23V24H9V22.5Z" fill="#ffffff"/>
        </svg>
      </div>

      <!-- Main Title -->
      <h1 class="page-title">
        Please verify your identity, {{ $user->username }}
        <span class="page-title-sub">សូមផ្ទៀងផ្ទាត់អត្តសញ្ញាណរបស់អ្នក, {{ $user->username }}</span>
      </h1>

      <!-- GitHub-style Box Container -->
      <div class="card-box">
        
        <p class="intro-text">
          Here is your MiniStore KH sudo authentication code:
          <span class="intro-subtext">នេះជាលេខកូដសម្ងាត់ផ្ទៀងផ្ទាត់សុវត្ថិភាព MiniStore KH របស់អ្នក៖</span>
        </p>

        <!-- Big Clean Monospace Verification Code -->
        <div class="code-display">
          {{ $code }}
        </div>

        <p class="info-text">
          This code is valid for <strong>{{ $expiresMinutes }} minutes</strong> and can only be used once.
          <span class="info-subtext">លេខកូដនេះមានសុពលភាពរយៈពេល <strong>{{ $expiresMinutes }} នាទី</strong> និងអាចប្រើប្រាស់បានតែម្តងប៉ុណ្ណោះ។</span>
        </p>

        <p class="warning-text">
          Please don't share this code with anyone; we'll never ask for it on the phone or via email.
          <span class="warning-subtext">សូមកុំចែករំលែកលេខកូដនេះទៅកាន់អ្នកណាឱ្យសោះ យើងខ្ញុំនឹងមិនទូរស័ព្ទ ឬផ្ញើអ៊ីមែលសុំលេខកូដនេះឡើយ។</span>
        </p>

        <div class="signoff">
          <div>Thanks,</div>
          <div style="font-weight: 600;">The MiniStore KH Team</div>
          <div class="signoff-sub">សូមអរគុណ, ក្រុមការងារ MiniStore KH</div>
        </div>

      </div>

      <!-- Footer metadata / copyright -->
      <div class="footer-note">
        MiniStore KH · Nexa Commerce Platform · Phnom Penh, Cambodia<br>
        This email was sent to {{ $user->email ?? $user->username }} regarding a sign-in attempt.
      </div>

    </div>
  </div>
</body>
</html>
