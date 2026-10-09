# React + Vite

## Cash payment email notifications

The app queues an email in the top-level Firestore `mail` collection when a new payment is recorded using a payment method whose name is `Cash` (case-insensitive). Configure the Firebase **Trigger Email from Firestore** extension to watch the `mail` collection and use your Hostinger mailbox's SMTP settings. Keep the SMTP password in the extension's server-side configuration; do not add it to the Vite environment or client code.

Admins configure notification recipients in **Admin → Cash Payment Email Alerts**. Each queued message includes the payment amount, file ID, applicant name, country, file type, employee who recorded it, and receipt time. Email delivery will not begin until the Firebase extension is installed and configured.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
