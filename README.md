# VisaTrack

VisaTrack is a web application for managing the day-to-day operations of a visa and travel services business. It brings client files, staff assignments, service progress, invoices, payment records, reporting, and team administration into one workspace.

The product is built around workflows shaped by years of experience in the visa and travel services sector. Its goal is to make operational work easier to follow, reduce missed handoffs, and give staff and managers a clearer view of each file from registration through completion.

## Problems VisaTrack helps solve

Visa and travel service teams often coordinate work across paper records, spreadsheets, chat messages, and separate accounting tools. This can make it difficult to answer basic questions: Who owns this file? What is the next step? Has the client paid? Which files are still in progress? VisaTrack centralizes these workflows to help teams:

- Keep applicant and service information together in a searchable file record.
- Track ownership, status changes, notes, reminders, and processing handoffs.
- Distinguish active work from completed work using the right completion status for each service.
- Create invoices and keep a history of payments, including partial payments and transaction references.
- Review collections, outstanding dues, operating costs, and performance statistics.
- Give administrators tools for staff, assignments, payment methods, and other operational settings.

## Main features

### File and service management

Create and manage four file types:

- **Visa** — applicant, passport, destination, service charge, cost, and reminder details.
- **Air Ticket** — route, booking and ticket progress, PNR/portal details, sale price, and cost.
- **Package** — countries, nights, travelers, included services, flight/hotel progress, and package pricing.
- **Pick & Drop** — pickup and drop-off locations, passenger count, booking details, and sale/cost values.

Files include a human-readable file ID, creator, current assignee, current status, and activity history. Staff can add notes and follow status changes. Administrators can edit file details and reassign a file to a staff member, Processing Team, or Unassigned; reassignment is recorded in the file history.

When registering a file, VisaTrack warns about likely existing matches: Visa files by passport and destination; Package files by main passenger passport and the same set of countries; Air Ticket and Pick & Drop files by applicant, normalized phone, and matching route/locations. Staff can review the existing records and either cancel or proceed if this is a legitimate new service. Proceeding is recorded in the new file's history. These are review warnings, not a guarantee that every duplicate will be detected.

Administrators can open **Duplicates** to filter candidate pairs by file type, review state, file ID, applicant, or passport. A pair can be marked **Confirmed duplicate** or **Not a duplicate**, and decisions can be reopened. The review screen does not merge or delete files: admins can open each record and use the existing file-management actions after checking its history, invoice, and payments.

### Workflow tracking

The dashboard provides search, filters, reminders, active tasks, and file summaries. The pipeline and processing tracker help teams review in-process workloads, assignees, current statuses, and time in status. Dashboard workload notifications highlight active tasks assigned to the signed-in user.

The app's completion rules are service-specific:

| File type | Completion status |
| --- | --- |
| Visa | Result Received (`DONE`) |
| Package | Package Ready (`PACKAGE_READY`) |
| Air Ticket | Ticket Issued (`ISSUED`) |
| Pick & Drop | Pick & Drop Completed (`PICKUP_DROP_COMPLETED`) |

Pick & Drop progresses from Initiated to Booked, Confirmed, and Completed. Booked and Confirmed files are still in process.

### Invoices and payments

Invoices can be generated for supported files. Payment records capture the amount, method, transaction/reference ID, recorder, and payment time. Partial payments are recorded as separate transactions; generating an invoice for the remaining balance records only that new payment. Reprinting an invoice does not overwrite payment history.

Transaction references are normalized and reserved in Firestore to prevent reuse. Administrators can manage payment methods and account details as they change over time. Accounting views include collections over daily, monthly, yearly, or custom time ranges, due amounts, and collection details grouped by payment account.

### Cash payment email alerts

When a new payment is recorded using a method named **Cash** (case-insensitive), the app queues an email in the Firestore `mail` collection. Admins can configure notification recipients in **Admin → Cash Payment Email Alerts**. The message includes the payment amount, file ID, applicant, country, file type, staff member who recorded the payment, and receipt time.

Email delivery requires the Firebase **Trigger Email from Firestore** extension and a configured SMTP provider. The app only queues the message; it does not deliver email by itself. See the separate [Cash Payment Email Setup guide](./CASH_PAYMENT_EMAIL_SETUP.md) for Firebase, SMTP, security, and testing instructions. Keep SMTP credentials in the extension's server-side configuration, never in client code or Vite environment variables.

### Reporting and administration

Statistical reports provide operational and financial summaries. Role-aware dashboards include sales and processing activity. Admin tools cover staff accounts, destinations, ticket portals, payment methods, cash notification recipients, incentive settings, and holiday periods. Leave workflows support staff requests and administrator review.

### Public file tracking

The app supports a tracking page opened with a URL query parameter such as `?track=FILE_ID`. Review the public tracking information displayed by the application before sharing a link, and ensure deployed Firestore rules expose only the information intended for clients.

## User roles

The interface supports these roles:

- **Sales Representative** — register and manage sales-side work and hand off files.
- **Processing Agent** — receive and progress assigned files.
- **Manager/Admin** — manage users and settings, edit and reassign files, and access administrative and financial tools.
- **Accounts** — work with accounting features.

Role-based controls in the interface are not a substitute for backend authorization. Access must also be enforced by Firestore Security Rules.

## How to use the application

1. Sign in using the account provisioned for your team.
2. Open **New File** to register a Visa, Air Ticket, Package, or Pick & Drop file.
3. Use the **Dashboard** to search and filter files, review reminders, and open assigned tasks.
4. Update the file's status as work progresses; add notes when a handoff or decision needs context.
5. Use **Pipeline** and **Tracker** to review in-process work and assignments.
6. Open a file's invoice/payment workflow to record payments and transaction references. Record each partial payment when it is received.
7. Use **Accounting** and **Stats** for collection, due, and operational summaries, subject to role access.
8. Administrators can use **Admin** to maintain staff and operational settings, and edit a file to change its assignee without changing its creator.

Exact navigation options depend on the user's role.

## Technology

- **React 19** for the user interface.
- **Vite 7** for local development and production builds.
- **Firebase Authentication** for the app's Firebase identity and **Cloud Firestore** for real-time application data.
- **Tailwind CSS 3** for styling and **Lucide React** for icons.
- **jsPDF** for PDF-related functionality and **canvas-confetti** for UI celebrations.
- **Vercel Analytics** and **Vercel Speed Insights** for client-side usage/performance insights.

## Local development

### Requirements

- Node.js and npm.
- A Firebase project with Authentication and Cloud Firestore configured.

### Install and run

```sh
npm install
```

Create a `.env` file in the project root with the Firebase web-app configuration:

```dotenv
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Use values from the Firebase web app configuration. These client configuration values are not service-account credentials; never put a service-account key, SMTP password, or other server secret in a `VITE_` variable. Keep `.env` out of version control.

Start the local development server:

```sh
npm run dev
```

Build the production assets and preview the build locally:

```sh
npm run build
npm run preview
```

Run ESLint with:

```sh
npm run lint
```

## Firebase data and deployment notes

The app stores operational data in Firestore under `artifacts/app-version-3/public/data`, including `visa_files`, `agency_users`, `agency_settings`, `leave_requests`, and `approved_leaves`. Cash-payment email messages use the top-level `mail` collection, and payment-reference reservations use `invoice_payment_refs`.

Before deployment:

1. Configure Firebase Authentication and Firestore for the project.
2. Write, test, and deploy Firestore Security Rules that authorize each collection by authenticated identity and role. Restrict the `mail` collection and reference-reservation collection appropriately.
3. Test role access and public tracking behavior using a staging project and representative accounts.
4. If cash-payment email alerts are needed, install/configure the Trigger Email extension and SMTP credentials on the server side.
5. Back up production data before schema changes or migrations.


## File completion and payment behavior

- A file is considered complete only at its type-specific completion status in the table above.
- A Pick & Drop file remains active while Booked or Confirmed.
- Payment entries are kept as transaction history. An invoice reprint must not replace or duplicate prior transactions.
- Existing paid balances without transaction history may remain unattributed until they are reconciled; configure reporting expectations accordingly.
