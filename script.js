// ============ CONFIG ============

// Optional: if you sign up for a free CoinGecko API key, put it here:
const COINGECKO_API_KEY = ""; // e.g. "your-demo-api-key"

// Helper to append API key parameter if provided
function withApiKey(url) {
  if (!COINGECKO_API_KEY) return url;
  const hasQuery = url.includes("?");
  const sep = hasQuery ? "&" : "?";
  return `${url}${sep}x_cg_demo_api_key=${COINGECKO_API_KEY}`;
}

const API_URL = withApiKey(
  "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h"
);

const MARKET_CHART_URL = (id) =>
  withApiKey(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7`
    // interval param removed; CoinGecko defaults granularity appropriately
  );

// ============ DOM ELEMENTS ============

const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const lastUpdatedEl = document.getElementById("lastUpdated");
const rowsInfo = document.getElementById("rowsInfo");
const refreshBtn = document.getElementById("refreshBtn");
const refreshInfo = document.getElementById("refreshInfo");
const themeToggle = document.getElementById("themeToggle");

// Summary elements
const totalMarketCapEl = document.getElementById("totalMarketCap");
const totalVolumeEl = document.getElementById("totalVolume");
const biggestGainerEl = document.getElementById("biggestGainer");
const biggestGainerChangeEl = document.getElementById("biggestGainerChange");
const biggestLoserEl = document.getElementById("biggestLoser");
const biggestLoserChangeEl = document.getElementById("biggestLoserChange");

// Details tab elements
const selectedCoinBox = document.getElementById("selectedCoinBox");
const chartNote = document.getElementById("chartNote");
const chartCanvas = document.getElementById("coinChart");

// Tabs
const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");

// ============ STATE ============

let rawData = [];
let filteredData = [];
let autoRefreshTimer = null;
const AUTO_REFRESH_MS = 30000;

let currentSort = { key: "market_cap_rank", direction: "asc" };
let coinChart = null;

// ============ UTILITIES ============

function formatNumber(num, options = {}) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  return num.toLocaleString("en-US", options);
}

function updateStatus(live) {
  if (live) {
    statusDot.classList.add("live");
    statusDot.classList.remove("offline");
    statusText.textContent = "Live · Connected to CoinGecko API";
  } else {
    statusDot.classList.remove("live");
    statusDot.classList.add("offline");
    statusText.textContent = "Offline · Failed to fetch latest data";
  }
}

function updateLastUpdated() {
  const now = new Date();
  lastUpdatedEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ============ TABLE RENDERING ============

function createRow(coin, index) {
  const tr = document.createElement("tr");
  tr.dataset.coinId = coin.id;

  const rankTd = document.createElement("td");
  rankTd.textContent = coin.market_cap_rank ?? index + 1;

  const coinTd = document.createElement("td");
  const coinDiv = document.createElement("div");
  coinDiv.className = "coin-cell";

  const img = document.createElement("img");
  img.src = coin.image;
  img.alt = coin.name;
  img.className = "coin-img";

  const textDiv = document.createElement("div");
  textDiv.className = "coin-name-symbol";

  const coinName = document.createElement("span");
  coinName.className = "coin-name";
  coinName.textContent = coin.name;

  const coinSymbol = document.createElement("span");
  coinSymbol.className = "coin-symbol";
  coinSymbol.textContent = coin.symbol.toUpperCase();

  textDiv.appendChild(coinName);
  textDiv.appendChild(coinSymbol);
  coinDiv.appendChild(img);
  coinDiv.appendChild(textDiv);
  coinTd.appendChild(coinDiv);

  const priceTd = document.createElement("td");
  priceTd.className = "price";
  priceTd.textContent =
    "$" +
    formatNumber(coin.current_price, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const changeTd = document.createElement("td");
  changeTd.className = "price-change";
  const change = coin.price_change_percentage_24h;
  if (change > 0) {
    changeTd.classList.add("positive");
    changeTd.textContent = "+" + change.toFixed(2) + "%";
  } else if (change < 0) {
    changeTd.classList.add("negative");
    changeTd.textContent = change.toFixed(2) + "%";
  } else {
    changeTd.textContent = "0.00%";
  }

  const marketCapTd = document.createElement("td");
  marketCapTd.className = "market-cap";
  marketCapTd.textContent = "$" + formatNumber(coin.market_cap);

  const volumeTd = document.createElement("td");
  volumeTd.className = "volume";
  volumeTd.textContent = "$" + formatNumber(coin.total_volume);

  tr.appendChild(rankTd);
  tr.appendChild(coinTd);
  tr.appendChild(priceTd);
  tr.appendChild(changeTd);
  tr.appendChild(marketCapTd);
  tr.appendChild(volumeTd);

  tr.addEventListener("click", () => {
    showCoinDetails(coin);
  });

  return tr;
}

function renderTable(data) {
  tableBody.innerHTML = "";
  data.forEach((coin, idx) => {
    const row = createRow(coin, idx);
    tableBody.appendChild(row);
  });
  filteredData = data;
  rowsInfo.textContent = `Showing ${data.length} coins`;
}

// ============ SEARCH & SORT ============

function sortData(data, key, direction) {
  const sorted = [...data].sort((a, b) => {
    const va = a[key];
    const vb = b[key];

    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;

    if (typeof va === "string") {
      const comp = va.localeCompare(vb);
      return direction === "asc" ? comp : -comp;
    } else {
      const comp = va - vb;
      return direction === "asc" ? comp : -comp;
    }
  });
  return sorted;
}

function applySearchFilter() {
  const q = searchInput.value.trim().toLowerCase();
  let data = rawData;
  if (q) {
    data = rawData.filter(
      (coin) =>
        coin.name.toLowerCase().includes(q) ||
        coin.symbol.toLowerCase().includes(q)
    );
  }
  const sorted = sortData(data, currentSort.key, currentSort.direction);
  renderTable(sorted);
}

function handleHeaderClick() {
  const ths = document.querySelectorAll("thead th");
  ths.forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      if (!key) return;

      if (currentSort.key === key) {
        currentSort.direction =
          currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        currentSort.key = key;
        currentSort.direction = "asc";
      }

      applySearchFilter();
    });
  });
}

// ============ SUMMARY METRICS ============

function updateSummaries(data) {
  if (!data || data.length === 0) {
    totalMarketCapEl.textContent = "—";
    totalVolumeEl.textContent = "—";
    biggestGainerEl.textContent = "—";
    biggestLoserEl.textContent = "—";
    biggestGainerChangeEl.textContent = "";
    biggestLoserChangeEl.textContent = "";
    return;
  }

  const totalMarketCap = data.reduce(
    (sum, coin) => sum + (coin.market_cap || 0),
    0
  );
  const totalVolume = data.reduce(
    (sum, coin) => sum + (coin.total_volume || 0),
    0
  );

  totalMarketCapEl.textContent =
    "$" + formatNumber(totalMarketCap, { maximumFractionDigits: 0 });
  totalVolumeEl.textContent =
    "$" + formatNumber(totalVolume, { maximumFractionDigits: 0 });

  const byChange = [...data].filter(
    (c) => typeof c.price_change_percentage_24h === "number"
  );

  if (byChange.length > 0) {
    byChange.sort(
      (a, b) =>
        b.price_change_percentage_24h - a.price_change_percentage_24h
    );
    const gainer = byChange[0];
    const loser = byChange[byChange.length - 1];

    biggestGainerEl.textContent = gainer.name;
    biggestGainerChangeEl.textContent =
      "+" + gainer.price_change_percentage_24h.toFixed(2) + "% (24h)";

    biggestLoserEl.textContent = loser.name;
    biggestLoserChangeEl.textContent =
      loser.price_change_percentage_24h.toFixed(2) + "% (24h)";
  }
}

// ============ FETCH DATA (TABLE) ============

async function fetchData() {
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Network response not ok");

    const data = await response.json();
    rawData = data;
    updateStatus(true);
    updateLastUpdated();
    updateSummaries(data);
    applySearchFilter();
  } catch (err) {
    console.error("Error fetching data:", err);
    updateStatus(false);
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(fetchData, AUTO_REFRESH_MS);
  refreshInfo.textContent = "Auto: 30s";
}

// ============ DETAILS & CHART ============

function renderSelectedCoinBox(coin) {
  selectedCoinBox.classList.remove("empty");
  selectedCoinBox.innerHTML = "";

  const header = document.createElement("div");
  header.className = "selected-coin-header";

  const img = document.createElement("img");
  img.src = coin.image;
  img.alt = coin.name;

  const textDiv = document.createElement("div");
  const nameEl = document.createElement("div");
  nameEl.className = "selected-coin-name";
  nameEl.textContent = coin.name;

  const symbolEl = document.createElement("div");
  symbolEl.className = "selected-coin-symbol";
  symbolEl.textContent = coin.symbol.toUpperCase();

  textDiv.appendChild(nameEl);
  textDiv.appendChild(symbolEl);

  header.appendChild(img);
  header.appendChild(textDiv);

  const grid = document.createElement("div");
  grid.className = "selected-coin-grid";

  const items = [
    {
      label: "Price",
      value:
        "$" +
        formatNumber(coin.current_price, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      label: "Market cap",
      value: "$" + formatNumber(coin.market_cap),
    },
    {
      label: "24h change",
      value:
        (coin.price_change_percentage_24h >= 0 ? "+" : "") +
        coin.price_change_percentage_24h.toFixed(2) +
        "%",
    },
    {
      label: "24h volume",
      value: "$" + formatNumber(coin.total_volume),
    },
  ];

  for (const item of items) {
    const wrap = document.createElement("div");
    const label = document.createElement("span");
    label.className = "selected-label";
    label.textContent = item.label;
    const value = document.createElement("span");
    value.textContent = item.value;
    wrap.appendChild(label);
    wrap.appendChild(value);
    grid.appendChild(wrap);
  }

  selectedCoinBox.appendChild(header);
  selectedCoinBox.appendChild(grid);
}

// Fallback: generate fake 7-day history based on current price
function generateFallbackSeries(currentPrice) {
  const labels = [];
  const values = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(
      d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    );
    // random walk around current price (±10%)
    const noise = (Math.random() * 0.2 - 0.1) * currentPrice;
    values.push(Math.max(currentPrice + noise, 0));
  }

  return { labels, values };
}

async function loadCoinChart(coin) {
  chartNote.textContent = "Loading 7-day price history…";

  let labels = [];
  let values = [];
  let usedFallback = false;

  try {
    const response = await fetch(MARKET_CHART_URL(coin.id), {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch chart data");

    const data = await response.json();
    const prices = data.prices || [];

    if (!prices.length) {
      throw new Error("Empty prices array");
    }

    labels = prices.map(([ts]) => {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    });
    values = prices.map(([, price]) => price);
  } catch (err) {
    console.error("Chart error, using fallback data:", err);
    const fallback = generateFallbackSeries(coin.current_price);
    labels = fallback.labels;
    values = fallback.values;
    usedFallback = true;
  }

  if (coinChart) {
    coinChart.destroy();
  }

  coinChart = new Chart(chartCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: coin.name + " price (USD)",
          data: values,
          fill: false,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              "$" +
              formatNumber(ctx.parsed.y, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
          },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6, font: { size: 10 } },
        },
        y: {
          ticks: {
            callback: (value) =>
              "$" + formatNumber(value, { maximumFractionDigits: 0 }),
            font: { size: 10 },
          },
        },
      },
    },
  });

  chartNote.textContent = usedFallback
    ? "Showing simulated 7-day price trend (API historical data unavailable)."
    : "Showing hourly price data for the last 7 days.";
}

function showCoinDetails(coin) {
  switchTab("details");
  renderSelectedCoinBox(coin);
  loadCoinChart(coin);
}

// ============ TABS ============

function switchTab(tabName) {
  tabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName + "Tab");
  });
}

// ============ THEME ============

function loadThemeFromStorage() {
  const saved = localStorage.getItem("crypto-theme");
  if (!saved) return;
  const body = document.body;
  body.classList.remove("dark", "light");
  body.classList.add(saved);
  themeToggle.textContent = saved === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  const body = document.body;
  const current = body.classList.contains("dark") ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  body.classList.remove("dark", "light");
  body.classList.add(next);
  localStorage.setItem("crypto-theme", next);
  themeToggle.textContent = next === "dark" ? "🌙" : "☀️";
}

// ============ EVENT LISTENERS ============

searchInput.addEventListener("input", applySearchFilter);
refreshBtn.addEventListener("click", fetchData);
themeToggle.addEventListener("click", toggleTheme);

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;
    switchTab(tabName);
  });
});

// ============ INIT ============

handleHeaderClick();
loadThemeFromStorage();
fetchData();
startAutoRefresh();
