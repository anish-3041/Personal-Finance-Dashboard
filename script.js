// Initialize the application when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // App State
  const state = {
    transactions: [],
    budgets: {},
    goals: [],
    theme: "light",
    comparisons: {
      previousMonthIncome: 0,
      previousMonthExpense: 0,
      currentMonthIncome: 0,
      currentMonthExpense: 0,
    },
  };

  // DOM Elements
  const elements = {
    // Forms
    expenseForm: document.getElementById("expense-form"),
    incomeForm: document.getElementById("income-form"),
    budgetForm: document.getElementById("budget-form"),
    goalForm: document.getElementById("goal-form"),
    savingsCalcForm: document.getElementById("savings-calculator-form"),

    // Display areas
    transactionList: document.getElementById("transaction-list"),
    budgetList: document.getElementById("budget-list"),
    goalsList: document.getElementById("goals-list"),
    savingsResults: document.getElementById("savings-results"),

    // Summary elements
    totalIncome: document.getElementById("total-income"),
    totalExpense: document.getElementById("total-expense"),
    currentBalance: document.getElementById("current-balance"),
    savingsRate: document.getElementById("savings-rate"),
    incomeTrend: document.getElementById("income-trend"),
    expenseTrend: document.getElementById("expense-trend"),
    balanceTrend: document.getElementById("balance-trend"),

    // Chart elements
    doughnutChart: document.getElementById("doughnut-chart"),
    barChart: document.getElementById("bar-chart"),
    monthlyComparisonChart: document.getElementById("monthly-comparison-chart"),

    // Filters
    chartPeriod: document.getElementById("chart-period"),
    transactionType: document.getElementById("transaction-type"),
    transactionPeriod: document.getElementById("transaction-period"),
    transactionSearch: document.getElementById("transaction-search"),

    // Action buttons
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    exportDataBtn: document.getElementById("export-data"),
    importDataBtn: document.getElementById("import-data"),
    generateReportBtn: document.getElementById("generate-report"),
    addSampleDataBtn: document.getElementById("add-sample-data"),
    importFile: document.getElementById("import-file"),
  };

  // Charts
  let charts = {
    doughnut: null,
    bar: null,
    monthlyComparison: null,
  };

  // Initialize app
  initApp();

  // Function to initialize the application
  async function initApp() {
    if (!localStorage.getItem("userId")) {
      localStorage.setItem("userId", "user-" + crypto.randomUUID());
    }

    state.userId = localStorage.getItem("userId");

    // Load data from FirebaseDB
    await loadFromFirebase();

    // Set up event listeners
    setupEventListeners();

    // === Edit Modal: Save & Cancel ===

    // Hide modal on cancel
    document.getElementById("edit-cancel").addEventListener("click", () => {
      document.getElementById("edit-modal").classList.add("hidden");
    });

    document
      .getElementById("edit-form")
      .addEventListener("submit", function (e) {
        e.preventDefault();

        const id = document.getElementById("edit-id").value;
        const transaction = state.transactions.find(
          (t) => t.id.toString() === id
        );
        if (!transaction) {
          console.warn("Transaction not found for ID:", id);
          return;
        }

        transaction.name = document.getElementById("edit-name").value;
        transaction.amount = parseFloat(
          document.getElementById("edit-amount").value
        );
        transaction.category = document.getElementById("edit-category").value;
        transaction.date = document.getElementById("edit-date").value;
        transaction.timestamp = new Date().toISOString();

        saveToFirebase();
        renderData();
        showNotification("Transaction updated successfully!", "success");
        document.getElementById("edit-modal").classList.add("hidden");

        console.log("Trying to update transaction with ID:", id);
        console.log("Matching transaction:", transaction);
      });

    // Initialize UI
    initializeUI();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Attach update check button only when service worker is ready
      if (reg.installing) {
        reg.installing.addEventListener("statechange", () => {
          if (reg.active) {
            attachUpdateCheckButton(reg);
          }
        });
      } else {
        attachUpdateCheckButton(reg);
      }

      // ✅ If there's already a new SW waiting (like after reload)
      if (reg.waiting) {
        showNotification(
          "🔄 A new version is ready. Click to update.",
          "info",
          10000
        );
        document.body.addEventListener("click", function handleUpdateClick() {
          if (reg.waiting) {
            reg.waiting.postMessage({ action: "skipWaiting" });
            window.location.reload();
          }

          document.body.removeEventListener("click", handleUpdateClick);
        });
      }

      // ✅ When a new SW is found while app is running
      reg.onupdatefound = () => {
        const newWorker = reg.installing;
        newWorker.onstatechange = () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showNotification(
              "🔄 A new version is available. Click to update.",
              "info",
              10000
            );
            document.body.addEventListener(
              "click",
              function handleUpdateClick() {
                newWorker.postMessage({ action: "skipWaiting" });
                window.location.reload();
                document.body.removeEventListener("click", handleUpdateClick);
              }
            );
          }
        };
      };
    });
  }

  // ✅ Button handler function
  function attachUpdateCheckButton(reg) {
    const updateBtn = document.getElementById("check-updates-btn");
    if (!updateBtn) return;

    updateBtn.addEventListener("click", () => {
      console.log("📦 Manually checking for updates...");
      reg
        .update()
        .then(() => {
          showNotification("🔎 Checking for updates...", "info", 4000);

          setTimeout(() => {
            if (!reg.waiting && !reg.installing) {
              showNotification(
                "✅ You're already using the latest version!",
                "success",
                4000
              );
            }
          }, 3000);
        })
        .catch((err) => {
          console.warn("⚠️ ServiceWorker update failed:", err);
        });
    });
  }

  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      console.log("Service Worker registered successfully:", reg);
      attachUpdateCheckButton(reg);
    })
    .catch((err) => {
      console.error("Service Worker registration failed:", err);
    });

  // Event listeners setup
  function setupEventListeners() {
    // Form submissions
    elements.expenseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleTransactionSubmit("expense", elements.expenseForm, "expense");
    });

    elements.incomeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleTransactionSubmit("income", elements.incomeForm, "income");
    });
    elements.budgetForm.addEventListener("submit", handleBudgetSubmit);
    elements.goalForm.addEventListener("submit", handleGoalSubmit);
    elements.savingsCalcForm.addEventListener("submit", handleSavingsCalc);

    // Tab switching
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab));
    });

    document.querySelectorAll(".chart-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchChartTab(tab));
    });

    // Filters
    elements.chartPeriod.addEventListener("change", updateCharts);
    elements.transactionType.addEventListener("change", filterTransactions);
    elements.transactionPeriod.addEventListener("change", filterTransactions);
    elements.transactionSearch.addEventListener("input", filterTransactions);

    // Theme toggle
    elements.themeToggleBtn.addEventListener("click", toggleTheme);

    // Data operations
    elements.exportDataBtn.addEventListener("click", exportData);
    elements.importDataBtn.addEventListener("click", () =>
      elements.importFile.click()
    );
    elements.importFile.addEventListener("change", importData);
    elements.generateReportBtn.addEventListener("click", generateReport);
    elements.addSampleDataBtn.addEventListener("click", addSampleData);
    document.getElementById("reset-data-btn").addEventListener("click", () => {
      showConfirmation(
        "⚠️ This will erase all your saved data. Continue?",
        async () => {
          await resetUserData();
          showNotification("Data reset successfully.", "success");
        }
      );
    });
  }

  // Initialize UI elements
  function initializeUI() {
    // Set current date as default for forms
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("expense-date").value = today;
    document.getElementById("income-date").value = today;
    document.getElementById("goal-date").value = new Date(
      new Date().setFullYear(new Date().getFullYear() + 1)
    )
      .toISOString()
      .split("T")[0];

    // Set up toggle button text
    document.getElementById("toggle-transaction-type").textContent =
      "Switch to Income";

    // Initialize tabs
    document.querySelectorAll(".tab")[0].classList.add("active");
    document.getElementById("expense-tab").classList.add("active");

    document.querySelectorAll(".chart-tab")[0].classList.add("active");
    document.getElementById("doughnut-chart").style.display = "block";
  }

  // Load data from FirebaseDB
  async function loadFromFirebase(userId = state.userId) {
    try {
      const ref = window.firebaseDoc(window.firebaseDB, "users", userId);
      const docSnap = await window.firebaseGetDoc(ref);

      if (docSnap.exists()) {
        const data = docSnap.data();
        state.transactions = data.transactions || [];
        state.budgets = data.budgets || {};
        state.goals = data.goals || [];
        state.theme = data.theme || "light";

        applyTheme(state.theme);
        renderData();
        console.log("✅ Data loaded from Firebase.");
      } else {
        // 🆕 New user — no data yet (not an error)
        console.log("🆕 No data yet for user:", userId);
        state.theme = "light";
        applyTheme(state.theme);
        renderData();
        showNotification(
          "Welcome! Your data will be saved automatically.",
          "info"
        );
      }
    } catch (error) {
      console.error("❌ Firebase load error:", error.message);
      showNotification(
        "Error fetching your data. Please check your connection or try again.",
        "error"
      );
    }
  }

  // Save to Firebase DB
  async function saveToFirebase(userId = state.userId) {
    if (!window.firebaseDB) {
      console.error("🔥 Firebase DB not initialized");
      return;
    }

    try {
      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDB, "users", userId),
        {
          transactions: state.transactions,
          budgets: state.budgets,
          goals: state.goals,
          theme: state.theme,
        }
      );
      console.log("✅ Data saved to Firebase.");
    } catch (error) {
      console.error("❌ Firebase save error:", error);
      showNotification("Error saving data.", "error");
    }
  }

  window.saveToFirebase = saveToFirebase;
  window.loadFromFirebase = loadFromFirebase;

  // Handles income/expense form submission
  function handleTransactionSubmit(type, form, fieldPrefix) {
    const name = document.getElementById(`${fieldPrefix}-name`).value;
    const amount = parseFloat(
      document.getElementById(`${fieldPrefix}-amount`).value
    );
    const category = document.getElementById(`${fieldPrefix}-category`).value;
    const date = document.getElementById(`${fieldPrefix}-date`).value;

    const transaction = {
      id: generateId(),
      type,
      name,
      amount,
      category,
      date,
      timestamp: new Date().getTime(),
    };

    state.transactions.push(transaction);
    saveToFirebase();
    form.reset();
    document.getElementById(`${fieldPrefix}-date`).value = new Date()
      .toISOString()
      .split("T")[0];

    renderData();
    showNotification(
      `${type[0].toUpperCase() + type.slice(1)} added successfully!`,
      "success"
    );
  }

  // Handle budget form submission
  function handleBudgetSubmit(e) {
    e.preventDefault();

    const category = document.getElementById("budget-category").value;
    const amount = parseFloat(document.getElementById("budget-amount").value);

    if (!category) {
      showNotification("Please select a category.", "error");
      return;
    }

    state.budgets[category] = amount;
    saveToFirebase();

    elements.budgetForm.reset();
    renderBudgets();
    updateCharts();
    showNotification("Budget set successfully!", "success");
  }

  // Handle financial goal form submission
  function handleGoalSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("goal-name").value;
    const target = parseFloat(document.getElementById("goal-target").value);
    const date = document.getElementById("goal-date").value;
    const current =
      parseFloat(document.getElementById("goal-current").value) || 0;

    const goal = {
      id: generateId(),
      name,
      target,
      date,
      current,
      timestamp: new Date().getTime(),
    };

    state.goals.push(goal);
    saveToFirebase();

    elements.goalForm.reset();
    document.getElementById("goal-date").value = new Date(
      new Date().setFullYear(new Date().getFullYear() + 1)
    )
      .toISOString()
      .split("T")[0];

    renderGoals();
    showNotification("Financial goal added successfully!", "success");
  }

  // Handle savings calculator form submission
  function handleSavingsCalc(e) {
    e.preventDefault();

    const monthlySavings = parseFloat(
      document.getElementById("monthly-savings").value
    );
    const interestRate = parseFloat(
      document.getElementById("interest-rate").value
    );
    const timePeriod = parseInt(document.getElementById("time-period").value);

    // Calculate compound interest
    const monthlyRate = interestRate / 100 / 12;
    const numOfMonths = timePeriod * 12;

    // Formula: P * ((1 + r)^n - 1) / r
    // Where P is monthly deposit, r is monthly interest rate, n is number of months
    let futureValue = 0;

    if (monthlyRate === 0) {
      futureValue = monthlySavings * numOfMonths;
    } else {
      futureValue =
        monthlySavings *
        ((Math.pow(1 + monthlyRate, numOfMonths) - 1) / monthlyRate);
    }

    const totalContributions = monthlySavings * numOfMonths;
    const interestEarned = futureValue - totalContributions;

    // Display results
    const resultsHTML = `
          <div class="results-panel scale-in">
              <div class="results-title">Projected Savings after ${timePeriod} years</div>
              <div class="results-value">₹${futureValue.toFixed(2)}</div>
              <div class="results-breakdown">
                  <div class="breakdown-item">
                      <span>Total Contributions:</span>
                      <span>₹${totalContributions.toFixed(2)}</span>
                  </div>
                  <div class="breakdown-item">
                      <span>Interest Earned:</span>
                      <span>₹${interestEarned.toFixed(2)}</span>
                  </div>
                  <div class="breakdown-item">
                      <span>Annual Return Rate:</span>
                      <span>${interestRate}%</span>
                  </div>
              </div>
          </div>
      `;

    elements.savingsResults.innerHTML = resultsHTML;
  }

  // Tab switching
  function switchTab(tab) {
    // Get the tab group
    const tabGroup = tab.parentElement;
    const tabId = tab.getAttribute("data-tab");

    // Remove active class from all tabs in the group
    tabGroup.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
    });

    // Add active class to clicked tab
    tab.classList.add("active");

    // Hide all related content
    const tabContentGroup = tabGroup.nextElementSibling;
    tabContentGroup.querySelectorAll("div").forEach((content) => {
      content.classList.remove("active");
    });

    // Show the selected content
    document.getElementById(tabId).classList.add("active");
  }

  // Chart tab switching
  function switchChartTab(tab) {
    const chartId = tab.getAttribute("data-chart");

    // Remove 'active' class from all chart tabs
    document.querySelectorAll(".chart-tab").forEach((t) => {
      t.classList.remove("active");
    });

    // Add 'active' class to clicked tab
    tab.classList.add("active");

    // Hide all chart canvases
    elements.doughnutChart.style.display = "none";
    elements.barChart.style.display = "none";
    elements.monthlyComparisonChart.style.display = "none";

    // Show only the selected chart canvas
    document.getElementById(chartId).style.display = "block";
  }

  // Toggle theme
  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme();
    saveToFirebase();
  }

  // Apply theme based on current state
  function applyTheme() {
    const themeToggleBtn = elements.themeToggleBtn;
    const icon = themeToggleBtn.querySelector("i");
    const text = themeToggleBtn.querySelector("span");

    document.documentElement.setAttribute("data-theme", state.theme);

    if (state.theme === "dark") {
      icon.className = "fas fa-sun";
      text.textContent = "Light Mode";
    } else {
      icon.className = "fas fa-moon";
      text.textContent = "Dark Mode";
    }

    // Update charts with new theme colors
    updateCharts();
  }

  // Calculate financial statistics
  function calculateStats() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Filter transactions for current month
    const currentMonthTransactions = state.transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });

    // Calculate totals
    const totalIncome = state.transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = state.transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance = totalIncome - totalExpense;

    // Calculate savings rate
    const savingsRate =
      totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // Calculate trends
    calculateMonthlyComparisons();

    const incomeTrend = calculateTrend(
      state.comparisons.currentMonthIncome,
      state.comparisons.previousMonthIncome
    );
    const expenseTrend = calculateTrend(
      state.comparisons.currentMonthExpense,
      state.comparisons.previousMonthExpense
    );
    const balanceTrend = calculateTrend(
      state.comparisons.currentMonthIncome -
        state.comparisons.currentMonthExpense,
      state.comparisons.previousMonthIncome -
        state.comparisons.previousMonthExpense
    );

    return {
      totalIncome,
      totalExpense,
      currentBalance,
      savingsRate,
      incomeTrend,
      expenseTrend,
      balanceTrend,
    };
  }

  // Calculate monthly comparisons
  function calculateMonthlyComparisons() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear =
      currentMonth === 0 ? currentYear - 1 : currentYear;

    // Current month transactions
    const currentMonthTransactions = state.transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });

    // Previous month transactions
    const previousMonthTransactions = state.transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === previousMonth &&
        transactionDate.getFullYear() === previousMonthYear
      );
    });

    // Calculate income and expenses for current month
    state.comparisons.currentMonthIncome = currentMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    state.comparisons.currentMonthExpense = currentMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate income and expenses for previous month
    state.comparisons.previousMonthIncome = previousMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    state.comparisons.previousMonthExpense = previousMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // Calculate trend percentage
  function calculateTrend(current, previous) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return ((current - previous) / previous) * 100;
  }

  // Update financial summary display
  function updateFinancialSummary() {
    const stats = calculateStats();

    // Update amounts
    elements.totalIncome.textContent = `₹${stats.totalIncome.toFixed(2)}`;
    elements.totalExpense.textContent = `₹${stats.totalExpense.toFixed(2)}`;
    elements.currentBalance.textContent = `₹${stats.currentBalance.toFixed(2)}`;
    elements.savingsRate.textContent = `${stats.savingsRate.toFixed(1)}%`;

    // Update trends
    updateTrendDisplay(elements.incomeTrend, stats.incomeTrend);
    updateTrendDisplay(elements.expenseTrend, stats.expenseTrend);
    updateTrendDisplay(elements.balanceTrend, stats.balanceTrend);

    // Update savings tip
    const savingsTip = document.getElementById("savings-tip");
    if (stats.savingsRate >= 20) {
      savingsTip.textContent = "Great job! You are saving well.";
    } else if (stats.savingsRate >= 10) {
      savingsTip.textContent = "Good start. Aim for 20% or more.";
    } else if (stats.savingsRate > 0) {
      savingsTip.textContent = "Try to increase your savings rate.";
    } else {
      savingsTip.textContent = "You are spending more than you earn.";
    }
  }

  // Update trend display with icon and styling
  function updateTrendDisplay(element, trendValue) {
    const trendValueElement = element.querySelector(".trend-value");
    const trendIconElement = element.querySelector("i");

    trendValueElement.textContent = `${Math.abs(trendValue).toFixed(1)}%`;

    if (trendValue > 0) {
      element.classList.add("trend-up");
      element.classList.remove("trend-down");
      trendIconElement.className = "fas fa-arrow-up";
    } else if (trendValue < 0) {
      element.classList.add("trend-down");
      element.classList.remove("trend-up");
      trendIconElement.className = "fas fa-arrow-down";
    } else {
      element.classList.remove("trend-up", "trend-down");
      trendIconElement.className = "fas fa-equals";
    }
  }

  // Render transactions list
  function renderTransactions() {
    const filteredTransactions = getFilteredTransactions();

    if (filteredTransactions.length === 0) {
      elements.transactionList.innerHTML = `
              <div class="entry-item">
                  <div class="entry-details">
                      <h4>No transactions found</h4>
                      <p>Add transactions or adjust your filters</p>
                  </div>
              </div>
          `;
      return;
    }

    const transactionsHTML = filteredTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((transaction) => {
        const formattedDate = new Date(transaction.date).toLocaleDateString(
          "en-IN",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          }
        );

        return `
                  <div class="entry-item fade-in" data-id="${transaction.id}">
                      <div class="entry-details">
                          <h4>${transaction.name}</h4>
                          <p><span class="category-${
                            transaction.category
                          }">${getCategoryName(
          transaction.category
        )}</span> • ${formattedDate}</p>
                      </div>
                      <div class="entry-actions">
                          <span class="entry-amount ${
                            transaction.type === "income"
                              ? "income-amount"
                              : "expense-amount"
                          }">
                              ${
                                transaction.type === "income" ? "+" : "-"
                              } ₹${transaction.amount.toFixed(2)}
                          </span>
                          <button class="edit-btn" data-id="${
                            transaction.id
                          }" data-type="${transaction.type}">
                          <i class="fas fa-pen"></i></button>
                          <button class="delete-btn">
                              <i class="fas fa-trash"></i>
                          </button>
                      </div>
                  </div>
              `;
      })
      .join("");

    elements.transactionList.innerHTML = transactionsHTML;

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.parentElement.parentElement.getAttribute("data-id");

        showConfirmation(
          "Are you sure you want to delete this transaction?",
          () => {
            deleteTransaction(id);
          }
        );
      });
    });

    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        const type = this.getAttribute("data-type");

        const transaction = state.transactions.find(
          (t) => t.id.toString() === id
        );
        if (!transaction) return;

        document.getElementById("edit-id").value = id;
        document.getElementById("edit-type").value = type;
        document.getElementById("edit-name").value = transaction.name;
        document.getElementById("edit-amount").value = transaction.amount;
        document.getElementById("edit-category").value = transaction.category;
        document.getElementById("edit-date").value = transaction.date;

        document.getElementById("edit-modal").classList.remove("hidden");
      });
    });
  }

  // Filter transactions based on selected options
  function getFilteredTransactions() {
    const type = elements.transactionType.value;
    const period = elements.transactionPeriod.value;
    const search = elements.transactionSearch.value.toLowerCase();

    let filtered = [...state.transactions];

    // Filter by type
    if (type !== "all") {
      filtered = filtered.filter((t) => t.type === type);
    }

    // Filter by period
    if (period !== "all") {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const currentWeek = getWeekNumber(currentDate);

      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.date);
        const transactionYear = transactionDate.getFullYear();
        const transactionMonth = transactionDate.getMonth();
        const transactionWeek = getWeekNumber(transactionDate);

        if (period === "month") {
          return (
            transactionMonth === currentMonth && transactionYear === currentYear
          );
        } else if (period === "week") {
          return (
            transactionWeek === currentWeek && transactionYear === currentYear
          );
        }
        return true;
      });
    }

    // Filter by search term
    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          getCategoryName(t.category).toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  // Filter transactions based on UI filters
  function filterTransactions() {
    renderTransactions();
  }

  // Render budgets
  function renderBudgets() {
    if (Object.keys(state.budgets).length === 0) {
      elements.budgetList.innerHTML = `
              <div class="budget-item">
                  <p>No budgets set yet. Add your first budget to get started.</p>
              </div>
          `;
      return;
    }

    const budgetsHTML = Object.entries(state.budgets)
      .map(([category, amount]) => {
        // Calculate spent amount for this category
        const spent = getSpentAmountByCategory(category);
        const percentage = amount > 0 ? (spent / amount) * 100 : 0;
        const remaining = amount - spent;

        // Determine progress bar color
        let progressColor = "var(--primary-color)";
        if (percentage >= 90) {
          progressColor = "var(--expense-color)";
        } else if (percentage >= 70) {
          progressColor = "#f39c12";
        }

        return `
                  <div class="budget-item fade-in">
                      <div class="budget-info">
                          <h4>${getCategoryName(category)}</h4>
                          <p>Budget: ₹${amount.toFixed(2)}</p>
                      </div>
                      <div class="budget-progress">
                          <div class="progress-bar">
                              <div class="progress-fill" style="width: ${Math.min(
                                percentage,
                                100
                              )}%; background-color: ${progressColor}"></div>
                          </div>
                          <div class="progress-text">
                              ₹${spent.toFixed(2)} of ₹${amount.toFixed(
          2
        )} (${percentage.toFixed(1)}%)
                          </div>
                      </div>
                      <div class="budget-actions">
                          <button class="delete-btn">
                              <i class="fas fa-trash"></i>
                          </button>
                      </div>
                  </div>
              `;
      })
      .join("");

    elements.budgetList.innerHTML = budgetsHTML;

    // Add event listeners to delete buttons
    document.querySelectorAll(".budget-actions .delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const category =
          this.parentElement.parentElement.querySelector("h4").textContent;
        const categoryKey = getCategoryKey(category);

        showConfirmation(
          `Are you sure you want to delete the budget for "${category}"?`,
          () => {
            deleteBudget(categoryKey);
          }
        );
      });
    });
  }

  // Render financial goals
  function renderGoals() {
    if (state.goals.length === 0) {
      elements.goalsList.innerHTML = `
              <div class="goal-item">
                  <p>No goals set yet. Add your first financial goal to get started.</p>
              </div>
          `;
      return;
    }

    const goalsHTML = state.goals
      .map((goal) => {
        const progress = (goal.current / goal.target) * 100;
        const remaining = goal.target - goal.current;
        const formattedDate = new Date(goal.date).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        // Calculate time left
        const today = new Date();
        const targetDate = new Date(goal.date);
        const daysLeft = Math.ceil(
          (targetDate - today) / (1000 * 60 * 60 * 24)
        );

        // Calculate required monthly savings
        const monthsLeft = Math.ceil(daysLeft / 30);
        const requiredMonthlySavings =
          monthsLeft > 0 ? remaining / monthsLeft : 0;

        return `
                  <div class="goal-item bounce-in" data-id="${goal.id}">
                      <div class="goal-header">
                          <span class="goal-title">${goal.name}</span>
                          <span class="goal-date">Target: ${formattedDate}</span>
                      </div>
                      <div class="goal-progress-container">
                          <div class="goal-progress-bar">
                              <div class="goal-progress-fill" style="width: ${progress}%"></div>
                          </div>
                          <div class="goal-stats">
                              <span>₹${goal.current.toFixed(
                                2
                              )} of ₹${goal.target.toFixed(2)}</span>
                              <span>${progress.toFixed(1)}% completed</span>
                          </div>
                      </div>
                      <div class="goal-stats">
                          <span>Days left: ${daysLeft}</span>
                          <span>Need to save: ₹${requiredMonthlySavings.toFixed(
                            2
                          )}/month</span>
                      </div>
                      <div class="goal-actions">
                          <button class="goal-update-btn" onclick="updateGoalProgress('${
                            goal.id
                          }')">
                              Update Progress
                          </button>
                          <button class="delete-btn">
                              <i class="fas fa-trash"></i>
                          </button>
                      </div>
                  </div>
              `;
      })
      .join("");

    elements.goalsList.innerHTML = goalsHTML;

    // Add event listeners
    document.querySelectorAll(".goal-update-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.parentElement.parentElement.getAttribute("data-id");
        updateGoalProgress(id);
      });
    });

    document.querySelectorAll(".goal-actions .delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const id = this.parentElement.parentElement.getAttribute("data-id");

        showConfirmation("Are you sure you want to delete this goal?", () => {
          deleteGoal(id);
        });
      });
    });
  }

  // Update charts based on current data
  function updateCharts() {
    const chartPeriod = elements.chartPeriod.value;
    const filteredTransactions = filterTransactionsByPeriod(chartPeriod);

    // Get the currently active chart tab ID
    const activeChartTab = document.querySelector(".chart-tab.active");
    const activeChartId = activeChartTab?.getAttribute("data-chart");

    // Update all chart data
    updateDoughnutChart(filteredTransactions);
    updateBarChart(filteredTransactions);
    updateMonthlyComparisonChart(filteredTransactions);

    // Hide all chart canvases
    elements.doughnutChart.style.display = "none";
    elements.barChart.style.display = "none";
    elements.monthlyComparisonChart.style.display = "none";

    // Show only the chart canvas that matches the active chart tab
    if (activeChartId === "doughnut-chart") {
      elements.doughnutChart.style.display = "block";
    } else if (activeChartId === "bar-chart") {
      elements.barChart.style.display = "block";
    } else if (activeChartId === "monthly-comparison-chart") {
      elements.monthlyComparisonChart.style.display = "block";
    }
  }

  // Filter transactions by selected period
  function filterTransactionsByPeriod(period) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentWeek = getWeekNumber(currentDate);

    return state.transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      const transactionWeek = getWeekNumber(transactionDate);

      if (period === "month") {
        return (
          transactionMonth === currentMonth && transactionYear === currentYear
        );
      } else if (period === "week") {
        return (
          transactionWeek === currentWeek && transactionYear === currentYear
        );
      }
      return true;
    });
  }

  // Helper function to get week number of year
  function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Update doughnut chart
  function updateDoughnutChart(transactions) {
    const expensesByCategory = {};
    const themeColors = getThemeColors();

    // Get expenses by category
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        if (expensesByCategory[t.category]) {
          expensesByCategory[t.category] += t.amount;
        } else {
          expensesByCategory[t.category] = t.amount;
        }
      });

    // Prepare data for chart
    const labels = Object.keys(expensesByCategory).map(getCategoryName);
    const data = Object.values(expensesByCategory);

    // Define colors for categories
    const categoryColors = {
      food: "#FF6384",
      transport: "#36A2EB",
      utilities: "#FFCE56",
      entertainment: "#4BC0C0",
      shopping: "#9966FF",
      other: "#FF9F40",
    };

    const colors = Object.keys(expensesByCategory).map(
      (category) => categoryColors[category] || "#999999"
    );

    // Create or update chart
    if (charts.doughnut) {
      charts.doughnut.destroy();
    }
    charts.doughnut = new Chart(elements.doughnutChart, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderColor: themeColors.backgroundColor,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: themeColors.textColor,
              padding: 20,
              font: {
                size: 14,
              },
            },
          },
          title: {
            display: true,
            text: "Expense Distribution by Category",
            color: themeColors.textColor,
            font: {
              size: 16,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 30,
            },
          },
        },
      },
    });
  }

  // Update bar chart
  function updateBarChart(transactions) {
    const monthlyIncome = {};
    const monthlyExpense = {};
    const themeColors = getThemeColors();

    // Group transactions by month
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });

      if (t.type === "income") {
        if (monthlyIncome[monthKey]) {
          monthlyIncome[monthKey].amount += t.amount;
        } else {
          monthlyIncome[monthKey] = { label: monthName, amount: t.amount };
        }
      } else {
        if (monthlyExpense[monthKey]) {
          monthlyExpense[monthKey].amount += t.amount;
        } else {
          monthlyExpense[monthKey] = { label: monthName, amount: t.amount };
        }
      }
    });

    // Prepare data for chart
    const months = new Set();
    for (const key in monthlyIncome) months.add(key);
    for (const key in monthlyExpense) months.add(key);

    const sortedMonths = Array.from(months).sort();
    const labels = sortedMonths.map(
      (key) => monthlyIncome[key]?.label || monthlyExpense[key]?.label
    );

    const incomeData = sortedMonths.map(
      (key) => monthlyIncome[key]?.amount || 0
    );
    const expenseData = sortedMonths.map(
      (key) => monthlyExpense[key]?.amount || 0
    );

    // Create or update chart
    if (charts.bar) {
      charts.bar.destroy();
    }
    charts.bar = new Chart(elements.barChart, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Income",
            data: incomeData,
            backgroundColor: "#66BB6A",
            borderColor: "#43A047",
            borderWidth: 1,
          },
          {
            label: "Expenses",
            data: expenseData,
            backgroundColor: "#EF5350",
            borderColor: "#E53935",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: themeColors.textColor,
              padding: 20,
              font: {
                size: 14,
              },
            },
          },
          title: {
            display: true,
            text: "Monthly Income vs Expenses",
            color: themeColors.textColor,
            font: {
              size: 16,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 30,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: themeColors.textColor,
            },
            grid: {
              color: themeColors.gridColor,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: themeColors.textColor,
              callback: function (value) {
                return "₹" + value;
              },
            },
            grid: {
              color: themeColors.gridColor,
            },
          },
        },
      },
    });
  }

  // Update monthly comparison chart
  function updateMonthlyComparisonChart() {
    const themeColors = getThemeColors();

    // Get last 6 months data
    const months = [];
    const incomeData = [];
    const expenseData = [];
    const balanceData = [];

    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${month.getFullYear()}-${month.getMonth() + 1}`;
      const monthName = month.toLocaleDateString("en-IN", { month: "short" });

      months.push(monthName);

      // Filter transactions for this month
      const monthTransactions = state.transactions.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === month.getMonth() &&
          tDate.getFullYear() === month.getFullYear()
        );
      });

      // Calculate totals
      const monthIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpense = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthBalance = monthIncome - monthExpense;

      incomeData.push(monthIncome);
      expenseData.push(monthExpense);
      balanceData.push(monthBalance);
    }

    // Create or update chart
    if (charts.monthlyComparison) {
      charts.monthlyComparison.destroy();
    }
    charts.monthlyComparison = new Chart(elements.monthlyComparisonChart, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Income",
            data: incomeData,
            borderColor: "#66BB6A",
            backgroundColor: "rgba(102, 187, 106, 0.2)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: "Expenses",
            data: expenseData,
            borderColor: "#EF5350",
            backgroundColor: "rgba(239, 83, 80, 0.2)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: "Balance",
            data: balanceData,
            borderColor: "#42A5F5",
            backgroundColor: "rgba(66, 165, 245, 0.2)",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: themeColors.textColor,
              padding: 20,
              font: {
                size: 14,
              },
            },
          },
          title: {
            display: true,
            text: "6-Month Financial Trend",
            color: themeColors.textColor,
            font: {
              size: 16,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 30,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: themeColors.textColor,
            },
            grid: {
              color: themeColors.gridColor,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: themeColors.textColor,
              callback: function (value) {
                return "₹" + value;
              },
            },
            grid: {
              color: themeColors.gridColor,
            },
          },
        },
      },
    });
  }

  // Get theme-specific colors for charts
  function getThemeColors() {
    const isDark = state.theme === "dark";

    return {
      backgroundColor: isDark ? "#262c38" : "#ffffff",
      textColor: isDark ? "#e0e0e0" : "#333333",
      gridColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    };
  }

  // Calculate spent amount by category
  function getSpentAmountByCategory(category) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    return state.transactions
      .filter((t) => {
        const transactionDate = new Date(t.date);
        return (
          t.type === "expense" &&
          t.category === category &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // Get category name from category key
  function getCategoryName(category) {
    const categories = {
      // Expense categories
      food: "Food & Dining",
      transport: "Transportation",
      utilities: "Utilities & Bills",
      entertainment: "Entertainment",
      shopping: "Shopping",
      other: "Other Expenses",

      // Income categories
      salary: "Salary & Wages",
      investment: "Investments",
      gifts: "Gifts & Rewards",
      other: "Other Income",
    };

    return categories[category] || category;
  }

  // Get category key from category name
  function getCategoryKey(name) {
    const categoryMap = {
      "Food & Dining": "food",
      Transportation: "transport",
      "Utilities & Bills": "utilities",
      Entertainment: "entertainment",
      Shopping: "shopping",
      "Other Expenses": "other",
      "Salary & Wages": "salary",
      Investments: "investment",
      "Gifts & Rewards": "gifts",
      "Other Income": "other",
    };

    return categoryMap[name] || name;
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

  // Delete transaction
  function deleteTransaction(id) {
    const index = state.transactions.findIndex((t) => t.id === id);

    if (index !== -1) {
      state.transactions.splice(index, 1);
      saveToFirebase();
      renderData();
      showNotification("Transaction deleted successfully!", "success");
    }
  }

  // Delete budget
  function deleteBudget(category) {
    if (state.budgets[category]) {
      delete state.budgets[category];
      saveToFirebase();
      renderBudgets();
      updateCharts();
      showNotification("Budget deleted successfully!", "success");
    }
  }

  // Delete goal
  function deleteGoal(id) {
    const index = state.goals.findIndex((g) => g.id === id);

    if (index !== -1) {
      state.goals.splice(index, 1);
      saveToFirebase();
      renderGoals();
      showNotification("Goal deleted successfully!", "success");
    }
  }

  // Delete confirmation Dialog Box
  function showConfirmation(message, onConfirm) {
    console.log("CONFIRMATION SHOWN");
    const dialog = document.getElementById("confirm-dialog");
    const msg = document.getElementById("confirm-message");
    const yesBtn = document.getElementById("confirm-yes");
    const noBtn = document.getElementById("confirm-no");

    msg.textContent = message;
    dialog.classList.remove("hidden");

    const cleanup = () => {
      yesBtn.onclick = null;
      noBtn.onclick = null;
      dialog.classList.add("hidden");
    };

    yesBtn.onclick = () => {
      cleanup();
      onConfirm();
    };

    noBtn.onclick = cleanup;
  }

  // Update goal progress
  function updateGoalProgress(id) {
    const goal = state.goals.find((g) => g.id === id);

    if (!goal) return;

    const newAmount = prompt(
      `Update current savings for "${goal.name}"`,
      goal.current
    );

    if (newAmount !== null && !isNaN(parseFloat(newAmount))) {
      goal.current = parseFloat(newAmount);
      saveToFirebase();
      renderGoals();
      showNotification("Goal progress updated!", "success");
    }
  }

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Show notification
  function showNotification(message, type = "success", duration = 3000) {
    const notification = document.createElement("div");
    notification.className = `notification ${type} slide-in`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Force reflow to allow transition
    void notification.offsetWidth;

    // After animation, make it stick
    setTimeout(() => {
      notification.classList.add("show");
      notification.classList.remove("slide-in");
    }, 500); // match your slideIn duration

    // Hide after duration
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        notification.remove();
      }, 300); // match transition duration
    }, duration);
  }

  // Export data to JSON file
  function exportData() {
    const data = {
      transactions: state.transactions,
      budgets: state.budgets,
      goals: state.goals,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `finance_data_${new Date().toISOString().split("T")[0]}.json`;

    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotification("Data exported successfully!", "success");
    }, 100);
  }

  // Import data from JSON file
  function importData(e) {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        if (data.transactions) state.transactions = data.transactions;
        if (data.budgets) state.budgets = data.budgets;
        if (data.goals) state.goals = data.goals;

        saveToFirebase();
        renderData();

        showNotification("Data imported successfully!", "success");
      } catch (error) {
        console.error("Error importing data:", error);
        showNotification("Error importing data. Invalid file format.", "error");
      }
    };

    reader.readAsText(file);
    e.target.value = ""; // Reset file input
  }

  // Generate PDF report
  function generateReport() {
    const stats = calculateStats();

    alert(`Financial Report
    
Total Income: ₹${stats.totalIncome.toFixed(2)}
Total Expenses: ₹${stats.totalExpense.toFixed(2)}
Current Balance: ₹${stats.currentBalance.toFixed(2)}
Savings Rate: ${stats.savingsRate.toFixed(1)}%

This is a simplified version. In a full implementation, a proper PDF would be generated.`);

    showNotification("Report generated!", "success");
  }

  // Add sample data for demonstration
  function addSampleData() {
    if (
      confirm(
        "This will add sample transactions, budgets, and goals for demonstration. Continue?"
      )
    ) {
      // Sample transactions
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Clear existing data
      state.transactions = [];
      state.budgets = {};
      state.goals = [];

      // Add sample transactions for current and previous months
      const sampleTransactions = [
        // Current month
        {
          id: generateId(),
          type: "income",
          name: "Monthly Salary",
          amount: 50000,
          category: "salary",
          date: new Date(currentYear, currentMonth, 5)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
        {
          id: generateId(),
          type: "expense",
          name: "Rent",
          amount: 15000,
          category: "utilities",
          date: new Date(currentYear, currentMonth, 7)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
        {
          id: generateId(),
          type: "expense",
          name: "Grocery Shopping",
          amount: 4500,
          category: "food",
          date: new Date(currentYear, currentMonth, 10)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
        {
          id: generateId(),
          type: "expense",
          name: "Fuel",
          amount: 2000,
          category: "transport",
          date: new Date(currentYear, currentMonth, 12)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
        {
          id: generateId(),
          type: "expense",
          name: "Movie Night",
          amount: 1500,
          category: "entertainment",
          date: new Date(currentYear, currentMonth, 15)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
        {
          id: generateId(),
          type: "income",
          name: "Freelance Work",
          amount: 10000,
          category: "other",
          date: new Date(currentYear, currentMonth, 18)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
        {
          id: generateId(),
          type: "expense",
          name: "New Shoes",
          amount: 3000,
          category: "shopping",
          date: new Date(currentYear, currentMonth, 20)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },

        // Previous month
        {
          id: generateId(),
          type: "income",
          name: "Monthly Salary",
          amount: 50000,
          category: "salary",
          date: new Date(currentYear, currentMonth - 1, 5)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime() - 86400000 * 30,
        },
        {
          id: generateId(),
          type: "expense",
          name: "Rent",
          amount: 15000,
          category: "utilities",
          date: new Date(currentYear, currentMonth - 1, 7)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime() - 86400000 * 30,
        },
        {
          id: generateId(),
          type: "expense",
          name: "Grocery Shopping",
          amount: 5000,
          category: "food",
          date: new Date(currentYear, currentMonth - 1, 10)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime() - 86400000 * 30,
        },
      ];

      state.transactions = sampleTransactions;

      // Add sample budgets
      state.budgets = {
        food: 7000,
        transport: 3000,
        utilities: 18000,
        entertainment: 2500,
        shopping: 5000,
      };

      // Add sample goals
      state.goals = [
        {
          id: generateId(),
          name: "Emergency Fund",
          target: 100000,
          current: 35000,
          date: new Date(currentYear + 1, currentMonth, 1)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
        {
          id: generateId(),
          name: "New Laptop",
          target: 80000,
          current: 20000,
          date: new Date(currentYear, currentMonth + 6, 1)
            .toISOString()
            .split("T")[0],
          timestamp: new Date().getTime(),
        },
      ];

      saveToFirebase();
      renderData();
      showNotification("Sample data added successfully!", "success");
    }
  }

  // user data reset
  async function resetUserData() {
    // Clear state
    state.transactions = [];
    state.budgets = {};
    state.goals = [];
    state.theme = "light";

    // Save empty data to Firebase
    await saveToFirebase();

    // Apply default theme
    applyTheme(state.theme);

    // Re-render everything
    renderData();
  }

  // Render all data
  function renderData() {
    updateFinancialSummary();
    renderTransactions();
    renderBudgets();
    renderGoals();
    updateCharts();
    calculateMonthlyComparisons();
  }

  // Make functions available globally
  window.deleteTransaction = deleteTransaction;
  window.deleteBudget = deleteBudget;
  window.deleteGoal = deleteGoal;
  window.updateGoalProgress = updateGoalProgress;
});

// Toggle between expense and income forms
document
  .getElementById("toggle-transaction-type")
  .addEventListener("click", function () {
    const tabs = document.querySelectorAll(".tab");
    const expenseTab = document.querySelector('[data-tab="expense-tab"]');
    const incomeTab = document.querySelector('[data-tab="income-tab"]');

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
