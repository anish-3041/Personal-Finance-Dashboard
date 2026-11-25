# MoneyMitra: Smart Personal Finance Planner

## Project abstract

MoneyMitra is a progressive web application that helps users record income and expenses, plan category budgets, track savings goals, and understand their financial behaviour. Unlike a basic expense tracker, the application includes a transparent Smart Money Coach that generates a financial wellness score, forecasts month-end spending from the user's current daily spending rate, and highlights practical next steps based on budgets and goals.

The project is built with HTML, CSS, JavaScript, Chart.js, Firebase Firestore, and Progressive Web App technologies. It works responsively on desktop and mobile devices and supports offline access after the initial visit.

## Why this is a stronger mini project

- It solves a real student and household finance problem.
- It includes full CRUD operations for transactions, budgets, and goals.
- It has cloud persistence, offline support, import/export, and generated reports.
- It turns raw data into explainable decision support instead of only displaying charts.
- The UI has a distinct product identity and is responsive across screen sizes.

## Main modules

| Module | What it does |
| --- | --- |
| Transaction manager | Adds, edits, deletes, filters, and searches income and expense entries. |
| Budget manager | Stores monthly category limits and warns visually as spending approaches the limit. |
| Goal planner | Tracks progress, target dates, days remaining, and required monthly savings. |
| Visual analytics | Shows category distribution, income-versus-expense, and six-month trend charts. |
| Smart Money Coach | Calculates wellness, month-end projection, daily spending envelope, and priority recommendations. |
| Data and PWA layer | Syncs data with Firestore, exports/imports JSON, supports dark mode, and caches the app for offline use. |

## Smart Money Coach logic

The coach is intentionally rules-based rather than presented as unverified AI. This makes it reliable, explainable, and easy to demonstrate.

### Financial wellness score (0–100)

The score combines three measurable signals:

1. Savings behaviour: up to 45 points, based on the savings rate.
2. Budget discipline: up to 35 points, based on how close each category is to its limit.
3. Goal progress: up to 20 points, based on progress across active savings goals.

The score is capped between 0 and 100 and is labelled as needs attention, steady, or excellent. When the user has no data, the app deliberately shows a baseline state instead of a misleading score.

### Month-end expense forecast

```
average daily expense = current-month expense / current day of month
projected month-end expense = average daily expense × days in month
```

If budgets exist, the daily envelope is calculated as the remaining total budget divided by the remaining days. Otherwise, it uses projected disposable income. Every figure shown in the interface comes from the user's records.

## Suggested demo flow

1. Open the dashboard and click **Add Sample Data**.
2. Point out the summary cards and switch the chart tabs.
3. Explain how category budgets change colour near the 70% and 90% thresholds.
4. Scroll to **Your next best financial move** and explain the wellness score, spending forecast, and recommendations.
5. Add or update a goal to show the monthly amount required to reach it on time.
6. Demonstrate search/filtering, dark mode, JSON export, report generation, and offline/PWA support.

## Architecture for presentation

```text
Browser UI (HTML/CSS/JavaScript)
        │
        ├── Transaction, budget and goal state
        ├── Smart Money Coach calculations
        ├── Chart.js visualisations
        ├── Service Worker cache (offline PWA)
        │
        └── Firebase Firestore (cloud persistence)
```

## Important deployment note

The Firebase web configuration is designed to be public; security must be enforced through Firebase Authentication and Firestore Security Rules. The current version uses a device-generated ID for convenient personal syncing. Before presenting this as a multi-user public app, upgrade it to Firebase Authentication and restrict each `/users/{userId}` document so only that authenticated user can read or write it.

## Short viva answers

**Why is the prediction trustworthy?**  It is not a market prediction or black-box AI claim. It is an explainable projection from the user's average daily spending in the current month.

**How does the score work?**  It combines savings rate, budget adherence, and goal progress with fixed weights, then caps the result at 100.

**Why use Firebase?**  Firestore provides cloud persistence and offline-capable client storage without building a separate server for a mini project.

**What happens offline?**  The service worker caches app resources and Firestore's IndexedDB persistence keeps locally available data ready to synchronise after reconnecting.

**What would you add next?**  Firebase Authentication, recurring transactions, receipt scanning with explicit user consent, and a backend/API for notifications.
