# Cash Payment Email Notifications: Firebase Setup

This guide configures VisaTrack to email recipients when a payment is recorded with a payment method named **Cash**. VisaTrack creates a Firestore email document; Firebase's **Trigger Email from Firestore** extension sends it through an SMTP server.

> **Important security prerequisite:** Do not enable production email sending until Firestore rules prevent unauthorized users from creating or modifying documents in the top-level `mail` collection. The current app uses client-side role handling and can fall back to anonymous Firebase Authentication. A UI-only admin restriction is not sufficient protection against email abuse. This repository does not contain deployable Firestore rules, so have the project's rules reviewed and secured before allowing production client writes to `mail`.

## What the app sends

After a new Cash payment is recorded, VisaTrack writes a new document to the top-level Firestore collection `mail`. Its shape is compatible with the Firebase extension:

```json
{
  "to": ["recipient@example.com"],
  "message": {
    "subject": "Cash payment received - VT-12345",
    "text": "A cash payment has been received. ..."
  },
  "createdAt": "<Firestore server timestamp>"
}
```

The recipient list is read from **Admin → Cash Payment Email Alerts**. The message includes the amount, file ID, applicant name, country/route, file type, transaction reference, employee who recorded the payment, and receipt time.

The app does not set a `from` field in each document. The extension's configured **Default FROM address** will be used.

## Before you begin

You need:

- Access to the correct Firebase project as an Owner, Editor, or Firebase Admin.
- Cloud Firestore enabled in that project.
- A sender mailbox that can send email through SMTP (for example, your Hostinger mailbox).
- A secure, reviewed Firestore ruleset for `mail` before production use.

Firebase Extensions require the project to use the **Blaze pay-as-you-go plan**. Installing an extension itself is free, but its use of Firebase/Google Cloud services may incur charges. Check Firebase pricing for your usage and region.

## Step 1: Get SMTP details from your mail provider

In your email provider's admin panel, find the outgoing SMTP settings for the mailbox you want to send from. For Hostinger, use the SMTP hostname, port, encryption mode, username, and password shown for your mailbox in Hostinger hPanel. Settings can depend on the account or region, so confirm them there rather than relying on copied values.

The Firebase extension asks for an SMTP connection URI. Typical forms are:

```text
smtps://SMTP_USERNAME:SMTP_PASSWORD@SMTP_HOST:465
```

or, for a provider's STARTTLS submission endpoint:

```text
smtp://SMTP_USERNAME:SMTP_PASSWORD@SMTP_HOST:587
```

Use the scheme and port required by your provider. If the username or password contains reserved URI characters (such as `@`, `:`, `/`, `#`, or `%`), URL-encode those characters before placing the credentials in the URI.

**Never put the SMTP password in the app, source code, README, browser, or any `VITE_` environment variable.** Enter it only into the Firebase extension's protected configuration prompt.

## Step 2: Install the Firebase extension

1. Open the Firebase Console and select the VisaTrack Firebase project.
2. Open **Extensions** and choose **Explore Extensions**.
3. Find the official **Trigger Email from Firestore** extension (`firestore-send-email`) published by Firebase.
4. Review the extension's requested permissions, created resources, and current configuration options.
5. Click **Install** and choose the project and billing account if prompted.
6. In the configuration form, set:
   - **SMTP connection URI:** the provider's verified SMTP URI from Step 1.
   - **Email documents collection:** `mail` (top-level; do not enter `artifacts/app-version-3/public/data/mail`).
   - **Default FROM address:** the sender mailbox address authenticated by that SMTP account.
   - **Default REPLY-TO address:** optional; set only if replies should go elsewhere.
   - **Users collection / templates collection:** leave unset unless you intentionally configure the extension to use those optional features. VisaTrack supplies email addresses directly in `to` and the text body directly in `message.text`.
   - **Function location / region:** select a region appropriate for the project and supported by the extension. Prefer a nearby region and follow the extension's current prompts.
7. Review the final configuration and install. Wait until the extension reports that installation is complete.

Firebase's extension parameters can change between versions; follow the current prompts and the installed extension's details page if a label differs.

Official guides:

- [Trigger Email from Firestore extension](https://firebase.google.com/docs/extensions/official/firestore-send-email)
- [Install Firebase Extensions](https://firebase.google.com/docs/extensions/install-extensions)
- [Firestore Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)

## Step 3: Secure the Firestore mail collection

Before enabling this in production, have the application's Firebase Authentication and Firestore rules reviewed together. Rules should:

- Deny arbitrary client reads of queued email documents.
- Deny updates and deletes of queued email documents by ordinary clients.
- Allow only an appropriately authenticated and authorized app operation to create notification documents.
- Validate the document shape and restrict `to` addresses to the intended notification recipients; do not allow arbitrary recipients or arbitrary email body content.
- Ensure only authorized administrators can change the recipient settings document used by VisaTrack.
- Account for the fact that the current app's displayed role is client-managed and does not, by itself, establish trusted authorization in Firestore rules.

Do not use a broad rule such as `allow read, write: if request.auth != null` for `mail`. Anonymous Firebase users count as authenticated, and that rule could allow abuse. The safest long-term design is to have a trusted server-side function validate the payment and recipient configuration, then write the mail document. That is a separate security improvement; installing the extension does not add application authorization automatically.

Test rules in a staging Firebase project or with the Firestore Emulator before deploying them. Do not copy a generic rules snippet into production without integrating it into the complete ruleset and testing all existing app workflows.

## Step 4: Set notification recipients in VisaTrack

1. Sign in to VisaTrack as an administrator.
2. Open **Admin → Cash Payment Email Alerts**.
3. Enter the email address or addresses that should receive Cash payment notifications, using the form's expected separator format.
4. Save the settings.
5. Confirm the recipient configuration is visible after reloading the application.

Use only mailboxes authorized to receive applicant/payment information. The emails contain personally identifying and financial transaction details.

## Step 5: Test delivery in staging

1. Use a staging Firebase project and staging VisaTrack deployment, not production.
2. Add a controlled test recipient in **Cash Payment Email Alerts**.
3. Create a test file and record a small test payment using the **Cash** payment method. Use a unique transaction reference, as VisaTrack prevents reference reuse.
4. In Firestore, verify that exactly one new document appears in the top-level `mail` collection and that it has `to`, `message.subject`, and `message.text`.
5. In Firebase Console → **Extensions**, open the Trigger Email extension instance and inspect its logs/status if no email arrives.
6. Check the recipient's inbox and spam folder. Confirm the sender, subject, amount, file details, and recipient list.
7. Also test a non-Cash payment: it should not queue a notification.
8. Once checks pass, plan production rollout and test a real production notification with an approved recipient.

Recording a test payment changes the test file's payment history; use staging data that can safely retain the test transaction.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Payment recorded, but no email document exists | Confirm the selected method is named `Cash` (case-insensitive), recipients are saved in the Admin panel, and the client write is allowed by Firestore rules. |
| App says recipients are not configured | Add recipient email addresses in **Admin → Cash Payment Email Alerts**, then retry only if no payment was already recorded. |
| Email document exists but extension does not process it | Confirm the extension is active and configured to watch the root collection `mail`; check extension logs and required Google Cloud APIs/resources. |
| Extension reports SMTP authentication/connection errors | Recheck the provider's SMTP hostname, port, encryption mode, username, and password in the extension configuration. Check whether the mailbox/provider requires SMTP access to be enabled. |
| Extension reports sender errors | Set the extension's default FROM address to a sender permitted by the SMTP account/provider. |
| Email is rejected or goes to spam | Check SMTP/provider delivery logs, recipient spelling, sender-domain verification and SPF/DKIM/DMARC configuration with the mail provider. |
| A duplicate email is received | Inspect whether multiple extension instances watch `mail`, or whether a document was manually created/retried. Do not manually re-create a mail document for a payment without checking first. |

## Data and privacy notes

- VisaTrack queues only new Cash payments for which recipients are configured. If recipients are missing, the payment remains recorded and the UI reports that no notification was queued.
- Email delivery happens after the Firestore mail document is written; successful payment recording does not guarantee successful email delivery.
- The extension handles queued documents and may add processing metadata to them. Keep mail collection access restricted and apply your organization's retention policy.
- If SMTP credentials need rotation, update the extension's configuration in Firebase; do not edit the app bundle.
