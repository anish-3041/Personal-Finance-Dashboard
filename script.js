// Global variables
let transactions = {
  expenses: [],
  incomes: [],
};
let charts = {
  doughnut: null,
  bar: null,
};
let budgets = {};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Set today's date as default for forms
  setDefaultDates();

  // Load data from local storage
  loadData();

  // Initialize UI event listeners
  initializeEventListeners();

  // === Edit Modal: Save & Cancel ===

  // Hide modal on cancel
  document.getElementById("edit-cancel").addEventListener("click", () => {
    document.getElementById("edit-modal").classList.add("hidden");
  });

  // Save updated transaction
  document.getElementById("edit-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const id = parseInt(document.getElementById("edit-id").value);
    const type = document.getElementById("edit-type").value;

    const updated = {
      id: id, // Keep the original ID to properly update
      name: document.getElementById("edit-name").value,
      amount: parseFloat(document.getElementById("edit-amount").value),
      category: document.getElementById("edit-category").value,
      date: document.getElementById("edit-date").value,
      timestamp: new Date().toISOString(),
    };

    // Replace old transaction
    const typeList = type === "expense" ? "expenses" : "incomes";
    const index = transactions[typeList].findIndex((item) => item.id === id);

    if (index !== -1) {
      transactions[typeList][index] = updated;
    }

    saveData();
    updateUI();
    showNotification("Transaction updated successfully!");
    document.getElementById("edit-modal").classList.add("hidden");
  });

  // Cancel budget edit
  document
    .getElementById("cancel-budget-edit")
    .addEventListener("click", () => {
      document.getElementById("budget-edit-modal").classList.add("hidden");
    });

  // Save updated budget
  document
    .getElementById("budget-edit-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      const category = document.getElementById("edit-budget-category").value;
      const amount = parseFloat(
        document.getElementById("edit-budget-amount").value
      );

      if (amount <= 0 || isNaN(amount)) {
        showNotification("Invalid budget amount", "error");
        return;
      }

      budgets[category] = amount;
      saveData();
      updateBudgetList();
      showNotification("Budget updated successfully!");
      document.getElementById("budget-edit-modal").classList.add("hidden");
    });

  // Set up tab switching
  setupTabs();

  // Update UI with loaded data
  updateUI();

  // Add export/import features
  addExportImportFeatures();
});

function setDefaultDates() {
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Set default value to today AND apply min/max
  const expenseDateInput = document.getElementById("expense-date");
  const incomeDateInput = document.getElementById("income-date");

  expenseDateInput.value = formattedDate;  // Set default to today
  expenseDateInput.min = "2023-01-01";    // Minimum date
  expenseDateInput.max = formattedDate;    // Maximum date (today)

  incomeDateInput.value = formattedDate;   // Set default to today
  incomeDateInput.min = "2023-01-01";     // Minimum date
  incomeDateInput.max = formattedDate;    // Maximum date (today)
}

// Load data from local storage
function loadData() {
  // Load transactions
  const savedExpenses = localStorage.getItem("expenses");
  if (savedExpenses) {
    transactions.expenses = JSON.parse(savedExpenses);
  }

  const savedIncomes = localStorage.getItem("incomes");
  if (savedIncomes) {
    transactions.incomes = JSON.parse(savedIncomes);
  }

  // Load budgets
  const savedBudgets = localStorage.getItem("budgets");
  if (savedBudgets) {
    budgets = JSON.parse(savedBudgets);
  }
}

// Save data to local storage
function saveData() {
  localStorage.setItem("expenses", JSON.stringify(transactions.expenses));
  localStorage.setItem("incomes", JSON.stringify(transactions.incomes));
  localStorage.setItem("budgets", JSON.stringify(budgets));
}

// Initialize event listeners
function initializeEventListeners() {
  // Handle expense form submission
  document
    .getElementById("expense-form")
    .addEventListener("submit", handleExpenseSubmit);

  // Handle income form submission
  document
    .getElementById("income-form")
    .addEventListener("submit", handleIncomeSubmit);

  // Handle budget form submission
  document
    .getElementById("budget-form")
    .addEventListener("submit", handleBudgetSubmit);

  // Handle chart period change
  document
    .getElementById("chart-period")
    .addEventListener("change", updateCharts);

  // Handle transaction filters
  document
    .getElementById("transaction-type")
    .addEventListener("change", updateTransactionList);
  document
    .getElementById("transaction-period")
    .addEventListener("change", updateTransactionList);

  // Handle chart tab switching
  document.querySelectorAll(".chart-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remove active class from all tabs
      document
        .querySelectorAll(".chart-tab")
        .forEach((t) => t.classList.remove("active"));

      // Add active class to clicked tab
      this.classList.add("active");

      // Hide all charts
      document.getElementById("doughnut-chart").style.display = "none";
      document.getElementById("bar-chart").style.display = "none";

      // Show selected chart
      const chartId = this.getAttribute("data-chart");
      document.getElementById(chartId).style.display = "block";

      // Refresh charts
      updateCharts();
    });
  });
}

// Setup tab switching
function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");

      // Remove active class from all tabs and contents
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tabs-content > div")
        .forEach((c) => c.classList.remove("active"));

      // Add active class to selected tab and content
      this.classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // Setup toggle button for transaction type
  document
    .getElementById("toggle-transaction-type")
    .addEventListener("click", function () {
      const expenseTab = document.querySelector('.tab[data-tab="expense-tab"]');
      const incomeTab = document.querySelector('.tab[data-tab="income-tab"]');

      if (expenseTab.classList.contains("active")) {
        // Switch to income
        expenseTab.classList.remove("active");
        incomeTab.classList.add("active");
        document.getElementById("expense-tab").classList.remove("active");
        document.getElementById("income-tab").classList.add("active");
        this.textContent = "Switch to Expense";
      } else {
        // Switch to expense
        incomeTab.classList.remove("active");
        expenseTab.classList.add("active");
        document.getElementById("income-tab").classList.remove("active");
        document.getElementById("expense-tab").classList.add("active");
        this.textContent = "Switch to Income";
      }
    });
}

// Handle expense form submission
function handleExpenseSubmit(e) {
  e.preventDefault();

  const date = document.getElementById("expense-date").value;

  // Validate date
  if (!validateDate(date)) {
    showNotification("Date must be between 01-01-2023 and today!", "error");
    return; // Stop form submission
  }

  // Get form values
  const name = document.getElementById("expense-name").value;
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const category = document.getElementById("expense-category").value;

  // Create new expense object
  const expense = {
    id: Date.now(),
    name,
    amount,
    category,
    date,
    timestamp: new Date().toISOString(),
  };

  // Add to expenses array
  transactions.expenses.push(expense);

  // Save data
  saveData();

  // Reset form
  this.reset();

  // Set today's date again
  setDefaultDates();

  // Show success notification
  showNotification("Expense added successfully!");

  // Update UI
  updateUI();
}

// Handle income form submission
function handleIncomeSubmit(e) {
  e.preventDefault();

  const date = document.getElementById("income-date").value;

  // Validate date
  if (!validateDate(date)) {
    showNotification("Date must be between 01-01-2023 and today!", "error");
    return;
  }

  // Get form values
  const name = document.getElementById("income-name").value;
  const amount = parseFloat(document.getElementById("income-amount").value);
  const category = document.getElementById("income-category").value;

  // Create new income object
  const income = {
    id: Date.now(),
    name,
    amount,
    category,
    date,
    timestamp: new Date().toISOString(),
  };

  // Add to incomes array
  transactions.incomes.push(income);

  // Save data
  saveData();

  // Reset form
  this.reset();

  // Set today's date again
  setDefaultDates();

  // Show success notification
  showNotification("Income added successfully!");

  // Update UI
  updateUI();
}

// Handle budget form submission
function handleBudgetSubmit(e) {
  e.preventDefault();

  // Get form values
  const category = document.getElementById("budget-category").value;
  const amount = parseFloat(document.getElementById("budget-amount").value);

  if (!category) {
    showNotification("Please select a category", "error");
    return;
  }

  // Set budget for category
  budgets[category] = amount;

  // Save data
  saveData();

  // Reset form
  this.reset();

  // Show success notification
  showNotification("Budget set successfully!");

  // Update UI
  updateBudgetList();
}

// Update all UI elements
function updateUI() {
  updateTotalAmounts();
  updateTransactionList();
  updateCharts();
  updateBudgetList();
}

// Update total amounts in summary cards
function updateTotalAmounts() {
  // Calculate total income
  const totalIncome = transactions.incomes.reduce(
    (sum, income) => sum + income.amount,
    0
  );
  document.getElementById("total-income").textContent = `₹${totalIncome.toFixed(
    2
  )}`;

  // Calculate total expense
  const totalExpense = transactions.expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  document.getElementById(
    "total-expense"
  ).textContent = `₹${totalExpense.toFixed(2)}`;

  // Calculate current balance
  const balance = totalIncome - totalExpense;
  const balanceElement = document.getElementById("current-balance");
  balanceElement.textContent = `₹${balance.toFixed(2)}`;

  // Set color based on balance
  if (balance < 0) {
    balanceElement.style.color = "var(--expense-color)";
  } else {
    balanceElement.style.color = "var(--income-color)";
  }
}

// Update transaction list based on filters
function updateTransactionList() {
  const transactionList = document.getElementById("transaction-list");

  // Get filter values
  const typeFilter = document.getElementById("transaction-type").value;
  const periodFilter = document.getElementById("transaction-period").value;

  // Apply filters to get transactions
  let filteredTransactions = [];

  if (typeFilter === "all" || typeFilter === "expense") {
    filteredTransactions = filteredTransactions.concat(
      transactions.expenses
        .filter((expense) => {
          return matchesDateFilter(expense.date, periodFilter);
        })
        .map((expense) => ({
          ...expense,
          type: "expense",
        }))
    );
  }

  if (typeFilter === "all" || typeFilter === "income") {
    filteredTransactions = filteredTransactions.concat(
      transactions.incomes
        .filter((income) => {
          return matchesDateFilter(income.date, periodFilter);
        })
        .map((income) => ({
          ...income,
          type: "income",
        }))
    );
  }

  // Sort by date (newest first)
  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Clear current content
  transactionList.innerHTML = "";

  if (filteredTransactions.length === 0) {
    transactionList.innerHTML = `
          <div class="entry-item">
              <div class="entry-details">
                  <h4>No transactions found</h4>
                  <p>Try adjusting your filters or add new transactions</p>
              </div>
          </div>
      `;
    return;
  }

  // Add each transaction to the list
  filteredTransactions.forEach((transaction) => {
    const formattedDate = new Date(transaction.date).toLocaleDateString();
    const formattedAmount = transaction.amount.toFixed(2);

    const transactionItem = document.createElement("div");
    transactionItem.className = "entry-item";

    let categoryClass, categoryName;

    if (transaction.type === "expense") {
      categoryClass = `category-${transaction.category}`;
      categoryName = getCategoryName(transaction.category);
    } else {
      categoryClass = `category-${transaction.category}`;
      categoryName = getIncomeCategoryName(transaction.category);
    }

    transactionItem.innerHTML = `
          <div class="entry-details">
              <h4>${transaction.name}</h4>
              <p class="${categoryClass}">${categoryName} · ${formattedDate}</p>
          </div>
          <div class="entry-actions">
              <span class="entry-amount ${
                transaction.type === "expense"
                  ? "expense-amount"
                  : "income-amount"
              }">
                  ${
                    transaction.type === "expense" ? "-" : "+"
                  }₹${formattedAmount}
              </span>
              <button class="edit-btn" data-id="${transaction.id}" data-type="${
      transaction.type
    }">Edit</button>
              <button class="delete-btn" data-id="${
                transaction.id
              }" data-type="${transaction.type}">Delete</button>
          </div>
      `;

    transactionList.appendChild(transactionItem);
  });

  // Add event listeners to delete buttons
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      const type = this.getAttribute("data-type");
      deleteTransaction(id, type);
    });
  });

  // Add event listeners to edit buttons
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      const type = this.getAttribute("data-type");
      handleEditTransaction(id, type);
    });
  });
}

// Check if a date matches the selected date filter
function matchesDateFilter(dateString, filter) {
  if (filter === "all") return true;

  const date = new Date(dateString);
  const today = new Date();

  if (filter === "month") {
    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  if (filter === "week") {
    // Get start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return date >= startOfWeek;
  }

  return true;
}

// Delete a transaction
function deleteTransaction(id, type) {
  // Confirm deletion
  if (confirm("Are you sure you want to delete this transaction?")) {
    if (type === "expense") {
      transactions.expenses = transactions.expenses.filter(
        (expense) => expense.id !== id
      );
    } else {
      transactions.incomes = transactions.incomes.filter(
        (income) => income.id !== id
      );
    }

    // Save data
    saveData();

    // Show notification
    showNotification("Transaction deleted successfully!");

    // Update UI
    updateUI();
  }
}

// Fixed handleEditTransaction function
function handleEditTransaction(id, type) {
  // Determine the correct array based on type
  const typeList = type === "expense" ? "expenses" : "incomes";
  const item = transactions[typeList].find((entry) => entry.id === id);

  if (!item) {
    console.error(`Transaction with ID ${id} not found in ${typeList}`);
    return;
  }

  // Fill modal form
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-type").value = type;
  document.getElementById("edit-name").value = item.name;
  document.getElementById("edit-amount").value = item.amount;
  document.getElementById("edit-category").value = item.category;
  document.getElementById("edit-date").value = item.date;

  // Show modal
  document.getElementById("edit-modal").classList.remove("hidden");
}

// Update charts based on current data and filters
function updateCharts() {
  const periodFilter = document.getElementById("chart-period").value;

  const activeChart = document
    .querySelector(".chart-tab.active")
    .getAttribute("data-chart");

  // Update doughnut chart (category breakdown)
  if (activeChart === "doughnut-chart") {
    updateDoughnutChart(periodFilter);
    // Update bar chart (income vs expenses)
  } else if (activeChart === "bar-chart") {
    updateBarChart(periodFilter);
  }
}

// Update doughnut chart using Chart.js
function updateDoughnutChart(periodFilter) {
  const ctx = document.getElementById("doughnut-chart").getContext("2d");

  // Get filtered expenses
  const filteredExpenses = transactions.expenses.filter((expense) => {
    return matchesDateFilter(expense.date, periodFilter);
  });

  // Calculate totals by category
  const categoryTotals = {};
  const categories = [
    "food",
    "transport",
    "utilities",
    "entertainment",
    "shopping",
    "other",
  ];

  categories.forEach((cat) => {
    categoryTotals[cat] = 0;
  });

  filteredExpenses.forEach((expense) => {
    categoryTotals[expense.category] += expense.amount;
  });

  // Only include categories with values > 0
  const activeCategories = categories.filter((cat) => categoryTotals[cat] > 0);

  const data = {
    labels: activeCategories.map(getCategoryName),
    datasets: [
      {
        data: activeCategories.map((cat) => categoryTotals[cat]),
        backgroundColor: [
          "#e74c3c", // Food
          "#3498db", // Transport
          "#2ecc71", // Utilities
          "#f39c12", // Entertainment
          "#9b59b6", // Shopping
          "#34495e", // Other
        ],
        borderWidth: 1,
        borderColor: "#fff",
      },
    ],
  };

  // Destroy previous chart if it exists
  if (charts.doughnut) {
    charts.doughnut.destroy();
  }

  // Create new chart with Chart.js
  charts.doughnut = new Chart(ctx, {
    type: "doughnut",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            boxWidth: 12,
          },
        },
        title: {
          display: true,
          text: "Expense Breakdown by Category",
          font: {
            size: 16,
          },
          padding: {
            bottom: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Update bar chart using Chart.js
function updateBarChart(periodFilter) {
  const ctx = document.getElementById("bar-chart").getContext("2d");

  // Get filtered transactions
  const filteredExpenses = transactions.expenses.filter((expense) => {
    return matchesDateFilter(expense.date, periodFilter);
  });

  const filteredIncomes = transactions.incomes.filter((income) => {
    return matchesDateFilter(income.date, periodFilter);
  });

  // Get labels based on period
  let labels = [];
  let expenseData = [];
  let incomeData = [];

  if (periodFilter === "week") {
    // Day of week labels
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    labels = dayNames;

    // Initialize data arrays
    expenseData = Array(7).fill(0);
    incomeData = Array(7).fill(0);

    // Fill data arrays
    filteredExpenses.forEach((expense) => {
      const dayIndex = new Date(expense.date).getDay();
      expenseData[dayIndex] += expense.amount;
    });

    filteredIncomes.forEach((income) => {
      const dayIndex = new Date(income.date).getDay();
      incomeData[dayIndex] += income.amount;
    });
  } else if (periodFilter === "month") {
    // Get days in month
    const today = new Date();
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    // Create labels for each day
    for (let i = 1; i <= daysInMonth; i++) {
      labels.push(i.toString());
    }

    // Initialize data arrays
    expenseData = Array(daysInMonth).fill(0);
    incomeData = Array(daysInMonth).fill(0);

    // Fill data arrays
    filteredExpenses.forEach((expense) => {
      const day = new Date(expense.date).getDate();
      expenseData[day - 1] += expense.amount;
    });

    filteredIncomes.forEach((income) => {
      const day = new Date(income.date).getDate();
      incomeData[day - 1] += income.amount;
    });
  } else {
    // All time - group by month
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    labels = monthNames;

    // Initialize data arrays
    expenseData = Array(12).fill(0);
    incomeData = Array(12).fill(0);

    // Fill data arrays
    filteredExpenses.forEach((expense) => {
      const monthIndex = new Date(expense.date).getMonth();
      expenseData[monthIndex] += expense.amount;
    });

    filteredIncomes.forEach((income) => {
      const monthIndex = new Date(income.date).getMonth();
      incomeData[monthIndex] += income.amount;
    });
  }

  const data = {
    labels: labels,
    datasets: [
      {
        label: "Income",
        data: incomeData,
        backgroundColor: "rgba(46, 204, 113, 0.7)",
        borderColor: "rgba(46, 204, 113, 1)",
        borderWidth: 1,
      },
      {
        label: "Expenses",
        data: expenseData,
        backgroundColor: "rgba(231, 76, 60, 0.7)",
        borderColor: "rgba(231, 76, 60, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Destroy previous chart if it exists
  if (charts.bar) {
    charts.bar.destroy();
  }

  // Create new chart with Chart.js
  charts.bar = new Chart(ctx, {
    type: "bar",
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "₹" + value;
            },
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Income vs Expenses",
          font: {
            size: 16,
          },
          padding: {
            bottom: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += "₹" + context.parsed.y.toFixed(2);
              }
              return label;
            },
          },
        },
      },
    },
  });
}

// Update budget list
function updateBudgetList() {
  const budgetList = document.getElementById("budget-list");

  // Clear current content
  budgetList.innerHTML = "";

  if (Object.keys(budgets).length === 0) {
    budgetList.innerHTML = `
          <div class="budget-item">
              <p>No budgets set yet. Add your first budget to get started.</p>
          </div>
      `;
    return;
  }

  // Add each budget to the list
  for (const [category, amount] of Object.entries(budgets)) {
    // Calculate current spending for this category this month
    const today = new Date();
    const categoryExpenses = transactions.expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expense.category === category &&
        expenseDate.getMonth() === today.getMonth() &&
        expenseDate.getFullYear() === today.getFullYear()
      );
    });

    const spent = categoryExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const percentage = amount > 0 ? (spent / amount) * 100 : 0;

    // Determine status class
    let statusClass = "success";
    if (percentage >= 90) {
      statusClass = "danger";
    } else if (percentage >= 75) {
      statusClass = "warning";
    }

    const budgetItem = document.createElement("div");
    budgetItem.className = "budget-item";

    budgetItem.innerHTML = `
          <div class="budget-info">
              <h4 class="category-${category}">${getCategoryName(category)}</h4>
              <p>Monthly Budget: ₹${amount.toFixed(2)}</p>
          </div>
          <div class="budget-progress">
              <div class="progress-bar">
                  <div class="progress-fill ${statusClass}" style="width: ${Math.min(
      percentage,
      100
    )}%"></div>
              </div>
              <div class="progress-text">
                  ₹${spent.toFixed(2)} of ₹${amount.toFixed(
      2
    )} (${percentage.toFixed(1)}%)
              </div>
          </div>
          <div class="budget-actions">
              <button class="edit-btn" data-category="${category}">Edit</button>
              <button class="delete-btn" data-category="${category}">Delete</button>
          </div>
      `;

    budgetList.appendChild(budgetItem);
  }

  // Add event listeners to delete buttons
  document.querySelectorAll(".budget-actions .delete-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const category = this.getAttribute("data-category");
      deleteBudget(category);
    });
  });

  document.querySelectorAll(".budget-actions .edit-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const category = this.getAttribute("data-category");
      const amount = budgets[category];

      document.getElementById("edit-budget-category").value = category;
      document.getElementById("edit-budget-display").value =
        getCategoryName(category);
      document.getElementById("edit-budget-amount").value = amount;

      document.getElementById("budget-edit-modal").classList.remove("hidden");
    });
  });
}

// Delete a budget
function deleteBudget(category) {
  // Confirm deletion
  if (confirm("Are you sure you want to delete this budget?")) {
    delete budgets[category];

    // Save data
    saveData();

    // Show notification
    showNotification("Budget deleted successfully!");

    // Update UI
    updateBudgetList();
  }
}

// Helper function to get category name
function getCategoryName(category) {
  const categoryNames = {
    food: "Food & Dining",
    transport: "Transportation",
    utilities: "Utilities & Bills",
    entertainment: "Entertainment",
    shopping: "Shopping",
    other: "Other",
  };

  return categoryNames[category] || category;
}

// Helper function to get income category name
function getIncomeCategoryName(category) {
  const categoryNames = {
    salary: "Salary & Wages",
    investment: "Investments",
    gifts: "Gifts & Rewards",
    other: "Other",
  };

  return categoryNames[category] || category;
}

// Show notification
function showNotification(message, type = "success") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Add styles
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.padding = "12px 20px";
  notification.style.backgroundColor =
    type === "success" ? "var(--income-color)" : "var(--expense-color)";
  notification.style.color = "white";
  notification.style.borderRadius = "5px";
  notification.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";
  notification.style.zIndex = "1000";
  notification.style.opacity = "0";
  notification.style.transform = "translateY(20px)";
  notification.style.transition = "all 0.3s ease";

  // Add to DOM
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  }, 10);

  // Auto remove after delay
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateY(20px)";

    // Remove from DOM after animation
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

/*
 * Validates if a date is between 01-01-2023 and today.
 * @param {string} dateString - Date in YYYY-MM-DD format.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validateDate(dateString) {
  const date = new Date(dateString);
  const minDate = new Date("2023-01-01");
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Include entire day

  return date >= minDate && date <= today;
}

// Export/Import functionality
function addExportImportFeatures() {
  // Add export & import button to the header
  const exportButton = document.getElementById("export-data");
  const importButton = document.getElementById("import-data");

  // Add hidden file input for import
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "import-file";
  fileInput.style.display = "none";
  fileInput.accept = ".json";

  document.body.appendChild(fileInput);

  // Add event listeners
  exportButton.addEventListener("click", exportData);
  importButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", importData);
}

// Export data
function exportData() {
  // Create data object
  const data = {
    expenses: transactions.expenses,
    incomes: transactions.incomes,
    budgets: budgets,
  };

  // Convert to JSON
  const jsonData = JSON.stringify(data, null, 2);

  // Create download link
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `finance_data_${new Date().toISOString().slice(0, 10)}.json`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Show notification
  showNotification("Data exported successfully!");
}

// Import data
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const data = JSON.parse(event.target.result);

      // Validate data structure
      if (data.expenses && data.incomes && data.budgets) {
        // Import data
        transactions.expenses = data.expenses;
        transactions.incomes = data.incomes;
        budgets = data.budgets;

        // Save to local storage
        saveData();

        // Update UI
        updateUI();

        // Show notification
        showNotification("Data imported successfully!");
      } else {
        throw new Error("Invalid data format");
      }
    } catch (error) {
      showNotification("Error importing data: " + error.message, "error");
    }

    // Reset file input
    e.target.value = "";
  };

  reader.readAsText(file);
}
