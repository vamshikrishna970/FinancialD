# PulseFi Finance Dashboard

A responsive finance dashboard built with React.js and JavaScript. It uses mock data, simulated role-based UI behavior, reusable components, and `localStorage` persistence to demonstrate the assignment requirements without any backend dependency.

## Project Structure

- `/Users/vamshikrishna/Documents/New project/index.html` - app shell and UI structure
- `/Users/vamshikrishna/Documents/New project/styles.css` - visual system, responsive layout, and component styling
- `/Users/vamshikrishna/Documents/New project/app.jsx` - React components, mock data, state handling, charts, RBAC simulation, and persistence

## State Management Approach

The app uses React state with hooks in `app.jsx`:

- `transactions` stores the working dataset
- `filters` stores search, category, type, and sorting controls
- `role` stores the selected frontend role
- `theme` stores the current UI theme

Every state-changing interaction updates component state, persists relevant data to `localStorage`, and React re-renders the affected UI.

## How To Run

This version uses React via CDN scripts, so you can run it without a build step:

1. Open `/Users/vamshikrishna/Documents/New project/index.html` directly in a browser.
2. Or serve the folder locally with:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## How It Meets The Assignment

### 1. Dashboard Overview

- Summary cards show Total Balance, Income, Expenses, and total transaction count
- Monthly cash flow trend provides a time-based visualization
- Expense donut chart provides a categorical spending breakdown

### 2. Transactions Section

- Table includes date, amount, category, type, merchant, and note
- Search, type filter, category filter, and sorting are included

### 3. Basic Role-Based UI

- Role dropdown switches between `Viewer` and `Admin`
- `Viewer` can only inspect data
- `Admin` can add, edit, and delete transactions through the modal form

### 4. Insights Section

- Highest spending category
- Month-over-month net cash flow comparison
- Savings-rate and average-expense observation

### 5. State Management

- Transactions, filters, role, and theme are all state-managed on the frontend
- Data persists via `localStorage`

### 6. UI and UX

- Clean, responsive layout with empty states and clear visual hierarchy
- Theme toggle for an extra usability touch
- Visual permissions messaging so the active role is always obvious
