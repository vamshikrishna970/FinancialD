const { useEffect, useMemo, useRef, useState } = React;

const STORAGE_KEY = "pulsefi-dashboard-state";
const THEME_KEY = "pulsefi-theme";

const seededTransactions = [
  { id: "t1", date: "2026-03-28", merchant: "Acme Corp Payroll", category: "Salary", type: "income", amount: 6200, note: "March salary" },
  { id: "t2", date: "2026-03-24", merchant: "Whole Harvest", category: "Groceries", type: "expense", amount: 184.72, note: "Weekly groceries" },
  { id: "t3", date: "2026-03-21", merchant: "Nimbus Air", category: "Travel", type: "expense", amount: 420.5, note: "Client visit flight" },
  { id: "t4", date: "2026-03-18", merchant: "Luma Electric", category: "Utilities", type: "expense", amount: 96.2, note: "Electricity bill" },
  { id: "t5", date: "2026-03-15", merchant: "Northstar Investments", category: "Investments", type: "income", amount: 340, note: "Dividend payout" },
  { id: "t6", date: "2026-03-12", merchant: "CityRent", category: "Housing", type: "expense", amount: 1450, note: "Monthly rent" },
  { id: "t7", date: "2026-02-27", merchant: "Cedar Cafe", category: "Dining", type: "expense", amount: 48.3, note: "Team lunch" },
  { id: "t8", date: "2026-02-24", merchant: "Acme Corp Payroll", category: "Salary", type: "income", amount: 6200, note: "February salary" },
  { id: "t9", date: "2026-02-20", merchant: "CarePlus", category: "Healthcare", type: "expense", amount: 120, note: "Pharmacy" },
  { id: "t10", date: "2026-02-16", merchant: "Metro Mobility", category: "Transport", type: "expense", amount: 72.4, note: "Transit card" },
  { id: "t11", date: "2026-02-10", merchant: "StreamHub", category: "Subscriptions", type: "expense", amount: 18.99, note: "Streaming service" },
  { id: "t12", date: "2026-01-28", merchant: "Freelance Client", category: "Side Hustle", type: "income", amount: 780, note: "Website project" },
  { id: "t13", date: "2026-01-19", merchant: "Fit Foundry", category: "Fitness", type: "expense", amount: 65, note: "Gym membership" },
  { id: "t14", date: "2026-01-08", merchant: "Blue Basket", category: "Groceries", type: "expense", amount: 132.14, note: "Pantry restock" },
  { id: "t15", date: "2025-12-29", merchant: "Acme Corp Bonus", category: "Bonus", type: "income", amount: 1500, note: "Performance bonus" },
  { id: "t16", date: "2025-12-20", merchant: "Harbor Stay", category: "Travel", type: "expense", amount: 265.1, note: "Weekend stay" },
  { id: "t17", date: "2025-11-12", merchant: "HomeFix", category: "Housing", type: "expense", amount: 210, note: "Repair work" },
  { id: "t18", date: "2025-10-04", merchant: "Acme Corp Payroll", category: "Salary", type: "income", amount: 6100, note: "October salary" }
];

const initialFilters = {
  search: "",
  type: "all",
  category: "all",
  sort: "date-desc"
};

function currency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

function preciseCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function monthKey(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
}

function loadInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      role: "viewer",
      filters: initialFilters,
      transactions: seededTransactions
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      role: parsed.role || "viewer",
      filters: { ...initialFilters, ...(parsed.filters || {}) },
      transactions: Array.isArray(parsed.transactions) && parsed.transactions.length
        ? parsed.transactions
        : seededTransactions
    };
  } catch {
    return {
      role: "viewer",
      filters: initialFilters,
      transactions: seededTransactions
    };
  }
}

function getSummary(transactions) {
  const income = transactions.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = transactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const balance = income - expenses;
  const savingsRate = income ? ((income - expenses) / income) * 100 : 0;
  return { income, expenses, balance, savingsRate };
}

function getMonthlySeries(transactions) {
  const months = new Map();
  transactions.forEach((tx) => {
    const key = monthKey(tx.date);
    if (!months.has(key)) {
      months.set(key, { income: 0, expense: 0 });
    }
    months.get(key)[tx.type] += tx.amount;
  });

  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, totals]) => ({
      key,
      label: monthLabel(key),
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense
    }));
}

function getExpenseBreakdown(transactions) {
  const totals = new Map();
  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      totals.set(tx.category, (totals.get(tx.category) || 0) + tx.amount);
    });

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function SummarySection({ filteredTransactions, totalTransactions }) {
  const summary = getSummary(filteredTransactions);
  const cards = [
    { label: "Total Balance", value: currency(summary.balance), meta: "Income minus expenses" },
    { label: "Income", value: currency(summary.income), meta: summary.income ? `+${summary.savingsRate.toFixed(1)}% savings rate` : "No income yet" },
    { label: "Expenses", value: currency(summary.expenses), meta: summary.income ? `${((summary.expenses / summary.income) * 100).toFixed(1)}% of income` : "No expense ratio" },
    { label: "Transactions", value: String(filteredTransactions.length), meta: `${totalTransactions} in dataset` }
  ];

  return (
    <section className="panel overview-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">Overview</p>
          <h2>Financial summary</h2>
        </div>
        <p className="section-meta">{filteredTransactions.length} matching transactions</p>
      </div>
      <div className="summary-grid">
        {cards.map((card) => (
          <article className="summary-card" key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span className="summary-trend">{card.meta}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function TrendChart({ transactions }) {
  const series = getMonthlySeries(transactions);
  if (!series.length) {
    return <div className="empty-chart">No trend data available.</div>;
  }

  const width = 640;
  const height = 280;
  const padding = 32;
  const maxValue = Math.max(...series.flatMap((item) => [item.income, item.expense, Math.abs(item.net)]), 1);
  const stepX = (width - padding * 2) / Math.max(series.length - 1, 1);

  const linePath = (key) =>
    series
      .map((item, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (item[key] / maxValue) * (height - padding * 2);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart" role="img" aria-label="Monthly income and expense trend">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" />
      {series.map((item, index) => {
        const barHeight = (Math.abs(item.net) / maxValue) * (height - padding * 2);
        const x = padding + index * stepX - 16;
        const y = height - padding - barHeight;
        const fill = item.net >= 0 ? "var(--accent)" : "var(--expense)";
        return <rect key={item.key} x={x} y={y} width="32" height={barHeight} rx="10" fill={fill} opacity="0.22" />;
      })}
      <path d={linePath("income")} fill="none" stroke="var(--income)" strokeWidth="3.5" strokeLinecap="round" />
      <path d={linePath("expense")} fill="none" stroke="var(--expense)" strokeWidth="3.5" strokeLinecap="round" />
      {series.map((item, index) => {
        const x = padding + index * stepX;
        const incomeY = height - padding - (item.income / maxValue) * (height - padding * 2);
        const expenseY = height - padding - (item.expense / maxValue) * (height - padding * 2);
        return (
          <React.Fragment key={`${item.key}-points`}>
            <circle cx={x} cy={incomeY} r="4" fill="var(--income)" />
            <circle cx={x} cy={expenseY} r="4" fill="var(--expense)" />
            <text x={x} y={height - 8} textAnchor="middle" className="chart-label">{item.label}</text>
          </React.Fragment>
        );
      })}
    </svg>
  );
}

function CategoryChart({ transactions }) {
  const breakdown = getExpenseBreakdown(transactions).slice(0, 6);
  if (!breakdown.length) {
    return <div className="empty-chart">No spending categories yet.</div>;
  }

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const colors = ["#0f766e", "#c2410c", "#2563eb", "#8b5cf6", "#d97706", "#059669"];
  let start = 0;

  return (
    <div className="category-chart-layout">
      <svg viewBox="0 0 240 240" className="svg-chart" role="img" aria-label="Spending breakdown by category">
        {breakdown.map((item, index) => {
          const portion = item.amount / total;
          const end = start + portion * Math.PI * 2;
          const x1 = 120 + Math.cos(start - Math.PI / 2) * 90;
          const y1 = 120 + Math.sin(start - Math.PI / 2) * 90;
          const x2 = 120 + Math.cos(end - Math.PI / 2) * 90;
          const y2 = 120 + Math.sin(end - Math.PI / 2) * 90;
          const largeArc = portion > 0.5 ? 1 : 0;
          const path = `M 120 120 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`;
          start = end;
          return <path key={item.category} d={path} fill={colors[index % colors.length]} opacity="0.9" />;
        })}
        <circle cx="120" cy="120" r="52" fill="var(--panel)" />
        <text x="120" y="112" textAnchor="middle" className="chart-label">Expenses</text>
        <text x="120" y="136" textAnchor="middle" className="chart-value">{currency(total)}</text>
      </svg>
      <div className="insights-list">
        {breakdown.map((item, index) => {
          const percent = ((item.amount / total) * 100).toFixed(1);
          return (
            <div className="insight-card" key={item.category}>
              <h3><span className="category-dot" style={{ color: colors[index % colors.length] }}>●</span> {item.category}</h3>
              <p>{preciseCurrency(item.amount)} · {percent}% of expenses</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightsSection({ transactions }) {
  const summary = getSummary(transactions);
  const monthlySeries = getMonthlySeries(transactions);
  const expenseBreakdown = getExpenseBreakdown(transactions);
  const latestMonth = monthlySeries.at(-1);
  const previousMonth = monthlySeries.at(-2);
  const topCategory = expenseBreakdown[0];
  const avgExpense = monthlySeries.length
    ? monthlySeries.reduce((sum, item) => sum + item.expense, 0) / monthlySeries.length
    : 0;

  const insights = [
    {
      title: "Highest spending category",
      body: topCategory
        ? `${topCategory.category} leads spending at ${preciseCurrency(topCategory.amount)}, making up the largest expense bucket in the dataset.`
        : "No expense categories yet. Add transactions to surface your spending mix."
    },
    {
      title: "Monthly comparison",
      body: latestMonth && previousMonth
        ? `Net cash flow moved from ${currency(previousMonth.net)} in ${previousMonth.label} to ${currency(latestMonth.net)} in ${latestMonth.label}.`
        : "At least two months of activity are needed for month-over-month comparisons."
    },
    {
      title: "Useful observation",
      body: summary.income
        ? `Your current savings rate is ${summary.savingsRate.toFixed(1)}%. Average monthly expenses sit near ${currency(avgExpense)}.`
        : "Income data is empty right now, so savings and trend insights are limited."
    }
  ];

  return (
    <section className="panel insights-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">Insights</p>
          <h2>Helpful observations</h2>
        </div>
      </div>
      <div className="insights-list">
        {insights.map((insight) => (
          <article className="insight-card" key={insight.title}>
            <h3>{insight.title}</h3>
            <p>{insight.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TransactionDialog({ open, mode, transaction, onClose, onSave, onDelete }) {
  const dialogRef = useRef(null);
  const [formState, setFormState] = useState({
    merchant: "",
    date: new Date().toISOString().slice(0, 10),
    category: "",
    type: "expense",
    amount: "",
    note: ""
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (transaction) {
      setFormState({
        merchant: transaction.merchant,
        date: transaction.date,
        category: transaction.category,
        type: transaction.type,
        amount: String(transaction.amount),
        note: transaction.note || ""
      });
    } else {
      setFormState({
        merchant: "",
        date: new Date().toISOString().slice(0, 10),
        category: "",
        type: "expense",
        amount: "",
        note: ""
      });
    }
    setMessage("");
  }, [transaction, open]);

  useEffect(() => {
    if (!dialogRef.current) return;
    if (open && !dialogRef.current.open) {
      dialogRef.current.showModal();
    } else if (!open && dialogRef.current.open) {
      dialogRef.current.close();
    }
  }, [open]);

  if (!open) return null;

  const readOnly = mode === "view";
  const title = mode === "edit" ? "Edit transaction" : mode === "view" ? "Transaction details" : "Add transaction";

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...transaction,
      id: transaction?.id || `tx-${Date.now()}`,
      merchant: formState.merchant.trim(),
      date: formState.date,
      category: formState.category.trim(),
      type: formState.type,
      amount: Number(formState.amount),
      note: formState.note.trim()
    };

    if (!payload.merchant || !payload.category || !payload.date || !payload.amount) {
      setMessage("Please complete all required fields.");
      return;
    }

    onSave(payload);
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      onClose={onClose}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const inside = rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width;
        if (!inside) onClose();
      }}
    >
      <form className="dialog-card" method="dialog" onSubmit={handleSubmit}>
        <div className="dialog-header">
          <div>
            <p className="section-label">Admin controls</p>
            <h2>{title}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="form-grid">
          <label>
            <span>Merchant</span>
            <input disabled={readOnly} value={formState.merchant} onChange={(event) => setFormState({ ...formState, merchant: event.target.value })} required />
          </label>
          <label>
            <span>Date</span>
            <input disabled={readOnly} type="date" value={formState.date} onChange={(event) => setFormState({ ...formState, date: event.target.value })} required />
          </label>
          <label>
            <span>Category</span>
            <input disabled={readOnly} value={formState.category} onChange={(event) => setFormState({ ...formState, category: event.target.value })} required />
          </label>
          <label>
            <span>Type</span>
            <select disabled={readOnly} value={formState.type} onChange={(event) => setFormState({ ...formState, type: event.target.value })}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label>
            <span>Amount</span>
            <input disabled={readOnly} type="number" min="0" step="0.01" value={formState.amount} onChange={(event) => setFormState({ ...formState, amount: event.target.value })} required />
          </label>
          <label>
            <span>Note</span>
            <input disabled={readOnly} value={formState.note} onChange={(event) => setFormState({ ...formState, note: event.target.value })} />
          </label>
        </div>

        <p className="form-message">{message}</p>

        <div className="dialog-actions">
          {mode === "edit" ? (
            <button className="ghost-button danger" type="button" onClick={() => onDelete(transaction.id)}>Delete</button>
          ) : <span />}
          {!readOnly && <button className="primary-button" type="submit">Save transaction</button>}
        </div>
      </form>
    </dialog>
  );
}

function TransactionsSection({
  role,
  filters,
  categories,
  filteredTransactions,
  onFiltersChange,
  onAdd,
  onEdit,
  onView
}) {
  const isAdmin = role === "admin";

  return (
    <section className="panel transactions-panel">
      <div className="section-heading section-heading-stack">
        <div>
          <p className="section-label">Transactions</p>
          <h2>Activity explorer</h2>
        </div>

        <div className="toolbar">
          <div className="toolbar-group">
            <input
              type="search"
              placeholder="Search merchant or category"
              aria-label="Search transactions"
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            />
            <select value={filters.type} aria-label="Filter by type" onChange={(event) => onFiltersChange({ ...filters, type: event.target.value })}>
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select value={filters.category} aria-label="Filter by category" onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-group">
            <select value={filters.sort} aria-label="Sort transactions" onChange={(event) => onFiltersChange({ ...filters, sort: event.target.value })}>
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
            </select>
            <button className="ghost-button" type="button" onClick={() => onFiltersChange(initialFilters)}>
              Clear filters
            </button>
            <button className="primary-button" type="button" disabled={!isAdmin} title={isAdmin ? "" : "Switch to Admin to add transactions"} onClick={onAdd}>
              Add transaction
            </button>
          </div>
        </div>
      </div>

      <div className="role-notice" aria-live="polite">
        {isAdmin
          ? "Admin mode is enabled. You can add, edit, and delete transactions for demo purposes."
          : "Viewer mode is enabled. Data remains visible, but editing controls are locked."}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id}>
                <td>{formatDate(tx.date)}</td>
                <td>
                  <strong>{tx.merchant}</strong>
                  <div>{tx.note || "No note"}</div>
                </td>
                <td>{tx.category}</td>
                <td><span className={`type-pill type-${tx.type}`}>{tx.type}</span></td>
                <td className={`amount-${tx.type}`}>{tx.type === "income" ? "+" : "-"}{preciseCurrency(tx.amount)}</td>
                <td>
                  <div className="table-actions">
                    <button className="text-button" type="button" onClick={() => onView(tx.id)}>View</button>
                    {isAdmin && <button className="text-button" type="button" onClick={() => onEdit(tx.id)}>Edit</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filteredTransactions.length && (
        <div className="empty-state">No transactions match the active filters.</div>
      )}
    </section>
  );
}

function App() {
  const initialState = useMemo(() => loadInitialState(), []);
  const [transactions, setTransactions] = useState(initialState.transactions);
  const [role, setRole] = useState(initialState.role);
  const [filters, setFilters] = useState(initialState.filters);
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || "light");
  const [dialogState, setDialogState] = useState({ open: false, mode: "add", id: null });

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, role, filters }));
  }, [transactions, role, filters]);

  const categories = useMemo(
    () => [...new Set(transactions.map((tx) => tx.category))].sort(),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();
    const list = transactions.filter((tx) => {
      const matchesSearch =
        !searchValue ||
        tx.merchant.toLowerCase().includes(searchValue) ||
        tx.category.toLowerCase().includes(searchValue) ||
        tx.note.toLowerCase().includes(searchValue);
      const matchesType = filters.type === "all" || tx.type === filters.type;
      const matchesCategory = filters.category === "all" || tx.category === filters.category;
      return matchesSearch && matchesType && matchesCategory;
    });

    return list.sort((a, b) => {
      switch (filters.sort) {
        case "date-asc":
          return new Date(a.date) - new Date(b.date);
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        case "date-desc":
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });
  }, [transactions, filters]);

  const activeTransaction = dialogState.id
    ? transactions.find((tx) => tx.id === dialogState.id) || null
    : null;

  function handleSave(transaction) {
    setTransactions((current) => {
      const exists = current.some((tx) => tx.id === transaction.id);
      return exists ? current.map((tx) => (tx.id === transaction.id ? transaction : tx)) : [transaction, ...current];
    });
    setDialogState({ open: false, mode: "add", id: null });
  }

  function handleDelete(id) {
    setTransactions((current) => current.filter((tx) => tx.id !== id));
    setDialogState({ open: false, mode: "add", id: null });
  }

  return (
    <>
      <div className="page-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Personal finance command center</p>
            <h1>PulseFi Dashboard</h1>
            <p className="hero-copy">
              Track balance movements, explore transactions, and surface spending
              signals with a lightweight role-aware React UI.
            </p>
          </div>

          <div className="hero-controls">
            <label className="control-card">
              <span>Role</span>
              <select value={role} aria-label="Select role" onChange={(event) => setRole(event.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <button className="ghost-button" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              Toggle theme
            </button>
          </div>
        </header>

        <main className="dashboard-grid">
          <SummarySection filteredTransactions={filteredTransactions} totalTransactions={transactions.length} />

          <section className="panel chart-panel">
            <div className="section-heading">
              <div>
                <p className="section-label">Balance trend</p>
                <h2>Monthly cash flow</h2>
              </div>
              <p className="section-meta">Last 6 months</p>
            </div>
            <div className="chart-surface">
              <TrendChart transactions={transactions} />
            </div>
          </section>

          <section className="panel chart-panel">
            <div className="section-heading">
              <div>
                <p className="section-label">Spending mix</p>
                <h2>Category breakdown</h2>
              </div>
              <p className="section-meta">Expenses only</p>
            </div>
            <div className="chart-surface">
              <CategoryChart transactions={transactions} />
            </div>
          </section>

          <InsightsSection transactions={transactions} />

          <TransactionsSection
            role={role}
            filters={filters}
            categories={categories}
            filteredTransactions={filteredTransactions}
            onFiltersChange={setFilters}
            onAdd={() => role === "admin" && setDialogState({ open: true, mode: "add", id: null })}
            onEdit={(id) => role === "admin" && setDialogState({ open: true, mode: "edit", id })}
            onView={(id) => setDialogState({ open: true, mode: "view", id })}
          />
        </main>
      </div>

      <TransactionDialog
        open={dialogState.open}
        mode={dialogState.mode}
        transaction={activeTransaction}
        onClose={() => setDialogState({ open: false, mode: "add", id: null })}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
