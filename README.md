# Spendwise — Expense Tracker

A personal expense tracker built with Next.js 14 (App Router), TypeScript and Tailwind CSS. Data is stored in your browser's localStorage.

## Run it

Requires Node.js 18.17+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`. Tests: `npm test`.

## Features

- Add, edit and delete expenses (date, amount, category, description), with validation and Undo on delete
- Dashboard: this month vs last month, total, top category, daily average, a monthly spending chart (6/12 months) and a category breakdown
- Expenses page: search, category filter, date range with presets, sorting, filtered totals
- CSV export of the current filtered view
- Responsive layout, automatic dark mode, keyboard-accessible dialogs
