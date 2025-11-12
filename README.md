# **Live Crypto Pulse — Real-Time Cryptocurrency Dashboard**

**Live Crypto Pulse** is a modern, interactive front-end dashboard that displays **real-time cryptocurrency market data** using the **public CoinGecko API**.

It includes auto-refreshing data, search, sorting, detailed coin charts, dark/light mode, and a fully responsive layout — all built with **pure HTML, CSS, and JavaScript** (no backend required).

---

## 🚀 **Features**

### 🔄 **Live API Data**
- Fetches the **top 100 cryptocurrencies** by market cap (via CoinGecko)
- Auto-refreshes every **30 seconds**
- Manual “Refresh Now” button

### 🔍 **Search & Sorting**
- Search by **coin name** or **symbol**
- Sortable by:
  - Rank  
  - Name  
  - Price  
  - 24h change  
  - Market cap  
  - Volume  

### 🌙 **Dark & Light Mode**
- Theme toggle switch  
- Saves theme preference using `localStorage`

### 📊 **Live Summary Metrics**
Includes dynamic calculations:
- **Total market cap** (top 100)
- **Total 24h trading volume**
- **Biggest gainer (24h)**
- **Biggest loser (24h)**

### 📈 **Interactive Coin Details**
- Clicking any table row opens the **Details** tab  
- Displays:
  - **7-day price chart** (Chart.js)
  - **Current price**
  - **Market cap**
  - **24h change**
  - **24h volume**

### 🗂 **Multi-Tab Interface**
- **Dashboard** — live data + summary metrics  
- **Details** — chart + coin breakdown  
- **About** — project explanation  

### 📱 **Fully Responsive**
- Optimized for desktop, tablet, and mobile  
- Table hides extra columns on smaller screens  
