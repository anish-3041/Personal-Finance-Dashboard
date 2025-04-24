// Set today's date as default
document.addEventListener("DOMContentLoaded", function () {
    const today = new Date();
    const formattedDate = today.toISOString().substr(0, 10);
    document.getElementById("expense-date").value = formattedDate;
  
    // ✅ Set current month in the filter by default (e.g., "2025-04")
    const currentMonth = today.toISOString().substr(0, 7);
    document.getElementById("month-filter").value = currentMonth;
  
    // Load expenses from local storage
    loadExpenses();
  });
  
  // Global variables
  let expenses = [];
  let expenseChart = null;
  
  document.getElementById("month-filter").addEventListener("change", function () {
    updateUI();
  });
  
  // Handle form submission
  document
    .getElementById("expense-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
  
      // Get form values
      const name = document.getElementById("expense-name").value;
      const amount = parseFloat(document.getElementById("expense-amount").value);
      const category = document.getElementById("expense-category").value;
      const date = document.getElementById("expense-date").value;
  
      // Create new expense object
      const expense = {
        id: Date.now(),
        name,
        amount,
        category,
        date,
      };
  
      // Add to expenses array
      expenses.push(expense);
  
      // Save to local storage
      saveExpenses();
  
      // Reset form
      this.reset();
  
      // Set today's date again
      const today = new Date();
      const formattedDate = today.toISOString().substr(0, 10);
      document.getElementById("expense-date").value = formattedDate;
  
      // Update UI
      updateUI();
    });
  
  // Save expenses to local storage
  function saveExpenses() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }
  
  // Load expenses from local storage
  function loadExpenses() {
    const savedExpenses = localStorage.getItem("expenses");
    if (savedExpenses) {
      expenses = JSON.parse(savedExpenses);
      updateUI();
    }
  }
  
  // Update UI with current or filtered expenses
  function updateUI() {
    const selectedMonth = document.getElementById("month-filter").value;
    let filteredExpenses = expenses;
  
    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-");
      filteredExpenses = expenses.filter((expense) => {
        const date = new Date(expense.date);
        return (
          date.getFullYear() === parseInt(year) &&
          date.getMonth() + 1 === parseInt(month)
        );
      });
    }
  
    updateExpenseList(filteredExpenses);
    updateTotalAmount(filteredExpenses);
    updateChart(filteredExpenses);
  }
  
  
  function updateExpenseList(filteredExpenses = expenses) {
    const expenseList = document.getElementById("expense-list");
    expenseList.innerHTML = "";
  
    if (filteredExpenses.length === 0) {
      expenseList.innerHTML = `
        <div class="expense-item">
          <div class="expense-details">
            <h4>No expenses found</h4>
            <p>Try adding or changing the filter</p>
          </div>
        </div>`;
      return;
    }
  
    // Sort expenses by date (newest first)
    const sortedExpenses = [...filteredExpenses].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  
    sortedExpenses.forEach((expense) => {
      const formattedDate = new Date(expense.date).toLocaleDateString();
      const formattedAmount = expense.amount.toFixed(2);
  
      const expenseItem = document.createElement("div");
      expenseItem.className = "expense-item";
  
      expenseItem.innerHTML = `
        <div class="expense-details">
          <h4>${expense.name}</h4>
          <p class="category-${expense.category}">${getCategoryName(
        expense.category
      )} · ${formattedDate}</p>
        </div>
        <div class="expense-actions">
          <span class="expense-amount">$${formattedAmount}</span>
          <button class="delete-btn" data-id="${expense.id}">Delete</button>
        </div>
      `;
  
      expenseList.appendChild(expenseItem);
    });
  
    // Add delete event handlers
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", function () {
        const id = parseInt(this.getAttribute("data-id"));
        deleteExpense(id);
      });
    });
  }
  
  
  // Delete an expense
  function deleteExpense(id) {
    expenses = expenses.filter((expense) => expense.id !== id);
    saveExpenses();
    updateUI();
  }
  
  // Update the total amount
  function updateTotalAmount(filteredExpenses = expenses) {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById("total-amount").textContent = `$${total.toFixed(2)}`;
  }
  
  
  // Update the chart based on filtered expenses
  function updateChart(filteredExpenses = expenses) {
    const ctx = document.getElementById("expense-chart").getContext("2d");
  
    // Initialize category totals
    const categoryTotals = {
      food: 0,
      transport: 0,
      utilities: 0,
      entertainment: 0,
      shopping: 0,
      other: 0,
    };
  
    // Sum up expenses per category
    filteredExpenses.forEach((expense) => {
      categoryTotals[expense.category] += expense.amount;
    });
  
    const data = {
      labels: Object.keys(categoryTotals).map(getCategoryName),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: [
            "#e74c3c", // Food
            "#3498db", // Transport
            "#2ecc71", // Utilities
            "#f39c12", // Entertainment
            "#9b59b6", // Shopping
            "#34495e", // Other
          ],
        },
      ],
    };
  
    // Destroy previous chart if it exists
    if (expenseChart) {
      expenseChart.destroy();
    }
  
    // Create new doughnut chart
    expenseChart = new Chart(ctx, {
      type: "doughnut",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
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
  