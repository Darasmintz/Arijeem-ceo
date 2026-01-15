// CEO DASHBOARD CONTROLLER - COMPLETE FIXED VERSION
console.log('👑 Starting CEO Dashboard...');

class CEODashboard {
    constructor() {
        this.currentCEO = null;
        this.businessData = null;
        this.autoSyncTimer = null;
        this.sampleProductPrices = {
            'Rice 50kg': { retail: 25000, wholesale: 22000 },
            'Beans 50kg': { retail: 32000, wholesale: 28000 },
            'Garri 50kg': { retail: 15000, wholesale: 13000 },
            'Palm Oil 25L': { retail: 18000, wholesale: 16000 },
            'Flour 50kg': { retail: 20000, wholesale: 17500 },
            'Sugar 50kg': { retail: 28000, wholesale: 25000 },
            'Salt 50kg': { retail: 8000, wholesale: 7000 },
            'Tomato Paste': { retail: 5000, wholesale: 4500 },
            'Vegetable Oil': { retail: 12000, wholesale: 10500 },
            'Spaghetti': { retail: 3500, wholesale: 3000 }
        };
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Dashboard initializing...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check for auto-login
            setTimeout(() => this.checkAutoLogin(), 1000);
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('✅ Dashboard ready');
            
        } catch (error) {
            console.error('❌ Dashboard init error:', error);
            this.showMessage('Dashboard initialization failed', 'error');
        }
    }
    
    setupEventListeners() {
        // Setup button handlers
        const createBtn = document.querySelector('#createAccountScreen .btn-primary');
        if (createBtn) {
            createBtn.onclick = () => this.createCEOAccount();
        }
        
        const loginBtn = document.querySelector('#loginScreen .btn-primary');
        if (loginBtn) {
            loginBtn.onclick = () => this.loginCEO();
        }
        
        // Navigation
        const goToLogin = document.querySelector('#goToLogin');
        if (goToLogin) {
            goToLogin.onclick = (e) => {
                e.preventDefault();
                this.showLoginScreen();
            };
        }
        
        const goToCreate = document.querySelector('#goToCreate');
        if (goToCreate) {
            goToCreate.onclick = (e) => {
                e.preventDefault();
                this.showCreateAccountScreen();
            };
        }
    }
    
    startPeriodicUpdates() {
        // Clear existing timer
        if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
        
        this.autoSyncTimer = setInterval(() => {
            if (this.currentCEO && document.getElementById('dashboardScreen').style.display !== 'none') {
                this.loadBusinessData(true);
            }
        }, CEO_CONFIG.SYNC_INTERVAL);
    }
    
    // MESSAGE HANDLER
    showMessage(text, type = 'info') {
        try {
            // Create message element
            const msg = document.createElement('div');
            msg.className = 'message';
            msg.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: white; padding: 15px 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 5px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'}; z-index: 1000; display: flex; align-items: center; gap: 10px;">
                    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                    <span>${text}</span>
                </div>
            `;
            document.body.appendChild(msg);
            
            setTimeout(() => {
                if (msg.parentElement) msg.remove();
            }, CEO_CONFIG.MESSAGE_DISPLAY_TIME);
            
        } catch (error) {
            console.error('Show message error:', error);
        }
    }
    
    // CREATE CEO ACCOUNT
    async createCEOAccount() {
        try {
            const name = document.getElementById('ceoName')?.value.trim();
            const email = document.getElementById('ceoEmail')?.value.trim();
            const phone = document.getElementById('ceoPhone')?.value.trim();
            const password = document.getElementById('ceoPassword')?.value;
            const confirm = document.getElementById('ceoConfirmPassword')?.value;
            const agreed = document.getElementById('agreeTerms')?.checked;
            
            // Validation
            if (!name || !email || !password || !confirm) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (password !== confirm) {
                this.showMessage('Passwords do not match', 'error');
                return;
            }
            
            if (!agreed) {
                this.showMessage('Please agree to the terms', 'error');
                return;
            }
            
            // Show loading
            const btn = document.querySelector('#createAccountScreen .btn-primary');
            if (btn) {
                btn.innerHTML = '⏳ CREATING...';
                btn.disabled = true;
            }
            
            this.showMessage('Creating account...');
            
            // Create account
            const result = await window.ceoDB.createCEOAccount({
                name, email, phone, password
            });
            
            if (!result.success) {
                if (result.code === 'EXISTS') {
                    this.showMessage('Account exists. Please login.', 'info');
                    this.showLoginScreen();
                    const loginEmail = document.getElementById('loginEmail');
                    if (loginEmail) loginEmail.value = email;
                    return;
                }
                this.showMessage(result.message, 'error');
                return;
            }
            
            this.showMessage('Account created! Logging you in...', 'success');
            
            // Auto login
            setTimeout(async () => {
                const login = await window.ceoDB.loginCEO(email, password);
                
                if (login.success) {
                    this.currentCEO = login.user;
                    localStorage.setItem('ceo_user', JSON.stringify(this.currentCEO));
                    localStorage.setItem('ceo_email', email);
                    
                    this.showDashboard();
                    await this.loadBusinessData();
                    
                    this.showMessage(`Welcome, ${this.currentCEO.name}!`, 'success');
                } else {
                    this.showMessage(login.message, 'error');
                }
            }, 1000);
            
        } catch (error) {
            console.error('Create account error:', error);
            this.showMessage('Failed to create account', 'error');
        } finally {
            setTimeout(() => {
                const btn = document.querySelector('#createAccountScreen .btn-primary');
                if (btn) {
                    btn.innerHTML = '✅ CREATE ACCOUNT & ACCESS DASHBOARD';
                    btn.disabled = false;
                }
            }, 2000);
        }
    }
    
    // LOGIN CEO
    async loginCEO() {
        try {
            const email = document.getElementById('loginEmail')?.value.trim();
            const password = document.getElementById('loginPassword')?.value;
            
            if (!email || !password) {
                this.showMessage('Enter email and password', 'error');
                return;
            }
            
            const btn = document.querySelector('#loginScreen .btn-primary');
            if (btn) {
                btn.innerHTML = '⏳ LOGGING IN...';
                btn.disabled = true;
            }
            
            this.showMessage('Logging in...');
            
            const result = await window.ceoDB.loginCEO(email, password);
            
            if (!result.success) {
                this.showMessage(result.message, 'error');
                return;
            }
            
            this.currentCEO = result.user;
            localStorage.setItem('ceo_user', JSON.stringify(this.currentCEO));
            localStorage.setItem('ceo_email', email);
            
            this.showDashboard();
            await this.loadBusinessData();
            
            this.showMessage(`Welcome back, ${this.currentCEO.name}!`, 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed', 'error');
        } finally {
            const btn = document.querySelector('#loginScreen .btn-primary');
            if (btn) {
                btn.innerHTML = '🔑 ACCESS DASHBOARD';
                btn.disabled = false;
            }
        }
    }
    
    // SCREEN MANAGEMENT
    showCreateAccountScreen() {
        document.getElementById('createAccountScreen').style.display = 'flex';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'none';
    }
    
    showLoginScreen() {
        document.getElementById('createAccountScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboardScreen').style.display = 'none';
    }
    
    showDashboard() {
        document.getElementById('createAccountScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
        
        if (this.currentCEO) {
            document.getElementById('dashboardTitle').textContent = `👑 ${this.currentCEO.name}'s DASHBOARD`;
            this.updateWelcomeMessage();
        }
    }
    
    updateWelcomeMessage() {
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Good ';
        
        if (hour < 12) greeting += 'Morning';
        else if (hour < 18) greeting += 'Afternoon';
        else greeting += 'Evening';
        
        const welcomeEl = document.getElementById('welcomeMessage');
        if (welcomeEl) {
            welcomeEl.textContent = 
                `${greeting}! | Updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
    }
    
    // FORCE REFRESH
    async forceRefreshData() {
        try {
            const refreshBtn = document.querySelector('.btn-refresh');
            if (refreshBtn) {
                refreshBtn.innerHTML = '⏳ REFRESHING...';
                refreshBtn.disabled = true;
            }
            
            this.showMessage('Refreshing data...', 'info');
            
            const refreshed = await window.ceoDB.forceRefresh();
            
            if (refreshed) {
                this.showMessage('Data refreshed!', 'success');
                await this.loadBusinessData();
            } else {
                this.showMessage('Refresh failed', 'warning');
            }
            
        } catch (error) {
            console.error('Force refresh error:', error);
            this.showMessage('Refresh failed', 'error');
        } finally {
            setTimeout(() => {
                const refreshBtn = document.querySelector('.btn-refresh');
                if (refreshBtn) {
                    refreshBtn.innerHTML = '🔄 REFRESH NOW';
                    refreshBtn.disabled = false;
                }
            }, 2000);
        }
    }
    
    // LOAD BUSINESS DATA - FIXED
    async loadBusinessData(silent = false) {
        try {
            if (!silent) {
                this.showLoadingIndicator(true);
            }
            
            console.log('🔄 Loading business data...');
            this.businessData = await window.ceoDB.getBusinessData();
            
            // Enhance data with calculated prices and totals
            this.enhanceBusinessData();
            
            this.updateDashboard();
            this.updateConnectionStatus();
            
            if (!silent) {
                const dataAge = this.businessData?.summary?.lastUpdate ? 
                    Math.floor((new Date() - new Date(this.businessData.summary.lastUpdate)) / 1000) : 999;
                
                if (dataAge < 60) {
                    this.showMessage('Data loaded successfully', 'success');
                } else {
                    this.showMessage('Data loaded', 'info');
                }
            }
            
        } catch (error) {
            console.error('Load business data error:', error);
            this.showMessage('Failed to load data', 'error');
        } finally {
            if (!silent) {
                this.showLoadingIndicator(false);
            }
        }
    }
    
    // ENHANCE BUSINESS DATA WITH CALCULATED PRICES
    enhanceBusinessData() {
        if (!this.businessData) return;
        
        const { sales, products, summary } = this.businessData;
        
        // Calculate product sold counts from sales
        const productSalesCount = {};
        if (sales && sales.length > 0) {
            sales.forEach(sale => {
                const productName = sale.product_name || 'Unknown';
                const quantity = sale.quantity || 0;
                productSalesCount[productName] = (productSalesCount[productName] || 0) + quantity;
            });
        }
        
        // Enhance products with calculated data
        if (products && products.length > 0) {
            this.businessData.products = products.map(product => {
                const productName = product.name || 'Product';
                const soldToday = productSalesCount[productName] || 0;
                const retailPrice = product.retail_price || this.getEstimatedPrice(productName, 'retail');
                const wholesalePrice = product.wholesale_price || this.getEstimatedPrice(productName, 'wholesale');
                const currentQty = product.current_qty || 0;
                const stockValue = currentQty * retailPrice;
                const turnoverRate = soldToday > 0 ? Math.min(100, (soldToday / Math.max(currentQty, 1)) * 100) : 0;
                
                return {
                    ...product,
                    retail_price: retailPrice,
                    wholesale_price: wholesalePrice,
                    sold_today: soldToday,
                    stock_value: stockValue,
                    turnover_rate: turnoverRate,
                    profit_margin: retailPrice > 0 ? ((retailPrice - wholesalePrice) / retailPrice * 100).toFixed(1) : 0
                };
            });
            
            // Update top products with enhanced data
            this.businessData.topProducts = this.getTopProducts(products);
        }
        
        // Enhance sales with calculated profit
        if (sales && sales.length > 0) {
            this.businessData.sales = sales.map(sale => {
                const productName = sale.product_name || 'Unknown';
                const retailPrice = sale.unit_price || this.getEstimatedPrice(productName, 'retail');
                const wholesalePrice = this.getEstimatedPrice(productName, 'wholesale');
                const quantity = sale.quantity || 1;
                const totalPrice = sale.total_price || (retailPrice * quantity);
                const profitPerItem = retailPrice - wholesalePrice;
                const totalProfit = profitPerItem * quantity;
                
                return {
                    ...sale,
                    unit_price: retailPrice,
                    total_price: totalPrice,
                    profit_per_item: profitPerItem,
                    total_profit: totalProfit,
                    margin_percent: retailPrice > 0 ? (profitPerItem / retailPrice * 100).toFixed(1) : 0
                };
            });
            
            // Recalculate sales analysis with enhanced data
            this.businessData.salesAnalysis = this.analyzeSales(this.businessData.sales);
            
            // Update summary with recalculated totals
            this.businessData.summary.totalSales = this.businessData.sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
            this.businessData.summary.totalProfit = this.businessData.sales.reduce((sum, s) => sum + (s.total_profit || 0), 0);
            this.businessData.summary.profitMargin = this.businessData.summary.totalSales > 0 ? 
                (this.businessData.summary.totalProfit / this.businessData.summary.totalSales * 100).toFixed(1) : 0;
        }
        
        // Calculate total stock value
        if (products && products.length > 0) {
            const totalStockValue = products.reduce((sum, p) => {
                const retailPrice = p.retail_price || this.getEstimatedPrice(p.name, 'retail');
                const currentQty = p.current_qty || 0;
                return sum + (currentQty * retailPrice);
            }, 0);
            
            this.businessData.summary.totalStockValue = totalStockValue;
        }
    }
    
    getEstimatedPrice(productName, type = 'retail') {
        const normalizedName = productName.toLowerCase();
        
        // Check sample prices
        for (const [key, prices] of Object.entries(this.sampleProductPrices)) {
            if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
                return prices[type] || prices.retail;
            }
        }
        
        // Default estimated prices based on product type
        if (normalizedName.includes('rice')) return type === 'retail' ? 25000 : 22000;
        if (normalizedName.includes('beans')) return type === 'retail' ? 32000 : 28000;
        if (normalizedName.includes('garri')) return type === 'retail' ? 15000 : 13000;
        if (normalizedName.includes('oil')) return type === 'retail' ? 18000 : 16000;
        if (normalizedName.includes('flour')) return type === 'retail' ? 20000 : 17500;
        
        // Default fallback prices
        return type === 'retail' ? 10000 : 8000;
    }
    
    analyzeSales(sales) {
        if (!sales || sales.length === 0) {
            return {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                profitMargin: 0,
                peakHour: { hour: 0, amount: 0, formattedHour: 'N/A' },
                topReason: { reason: 'No sales', count: 0 }
            };
        }
        
        const hourlyData = {};
        const reasons = {};
        let totalSales = 0;
        let totalProfit = 0;
        
        sales.forEach(sale => {
            const hour = new Date(sale.sale_date || sale.created_at).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + (sale.total_price || 0);
            
            const reason = sale.reason || 'Unknown';
            reasons[reason] = (reasons[reason] || 0) + 1;
            
            totalSales += sale.total_price || 0;
            totalProfit += sale.total_profit || 0;
        });
        
        // Find peak hour
        let peakHour = { hour: 0, amount: 0 };
        Object.entries(hourlyData).forEach(([hour, amount]) => {
            if (amount > peakHour.amount) {
                peakHour = { hour: parseInt(hour), amount };
            }
        });
        
        // Find top reason
        let topReason = { reason: 'Unknown', count: 0 };
        Object.entries(reasons).forEach(([reason, count]) => {
            if (count > topReason.count) {
                topReason = { reason, count };
            }
        });
        
        return {
            totalSales,
            totalProfit,
            averageSale: sales.length > 0 ? totalSales / sales.length : 0,
            transactionCount: sales.length,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales * 100).toFixed(1) : 0,
            peakHour: {
                hour: peakHour.hour,
                amount: peakHour.amount,
                formattedHour: `${peakHour.hour}:00`
            },
            topReason
        };
    }
    
    getTopProducts(products) {
        if (!products || products.length === 0) return [];
        
        return products
            .map(p => {
                const productName = p.name || 'Product';
                const retailPrice = p.retail_price || this.getEstimatedPrice(productName, 'retail');
                const currentQty = p.current_qty || 0;
                const stockValue = currentQty * retailPrice;
                const soldToday = p.sold_today || 0;
                const turnoverRate = currentQty > 0 ? (soldToday / currentQty * 100).toFixed(1) : 0;
                
                return {
                    ...p,
                    name: productName,
                    retail_price: retailPrice,
                    current_qty: currentQty,
                    stock_value: stockValue,
                    sold_today: soldToday,
                    turnover_rate: turnoverRate,
                    performance_score: (retailPrice * soldToday) / Math.max(currentQty, 1)
                };
            })
            .sort((a, b) => b.performance_score - a.performance_score)
            .slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT);
    }
    
    showLoadingIndicator(show) {
        const loadingEl = document.getElementById('loadingIndicator');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }
    
    updateConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        const detailEl = document.getElementById('connectionDetail');
        
        if (this.businessData?.isConnected) {
            if (statusEl) {
                statusEl.textContent = '✅ Connected to main system';
                statusEl.className = 'connection-good';
            }
            if (detailEl) {
                detailEl.textContent = 'Live data connection active';
            }
        } else {
            if (statusEl) {
                statusEl.textContent = '⚠️ Using cached data';
                statusEl.className = 'connection-warning';
            }
            if (detailEl) {
                detailEl.textContent = 'No active connection';
            }
        }
    }
    
    // UPDATE DASHBOARD - FIXED
    updateDashboard() {
        if (!this.businessData) {
            console.log('⚠️ No business data to update');
            return;
        }
        
        const { summary, sales, products, debts, customers, stock, topProducts, salesAnalysis } = this.businessData;
        
        console.log(`📊 Updating dashboard with ${sales?.length || 0} sales, ${products?.length || 0} products`);
        
        this.updateBigNumbers(summary, salesAnalysis);
        this.updateStockAlert(stock);
        this.updateSalesAnalysis(salesAnalysis);
        this.updateSalesTable(sales);
        this.updateTopProductsTable(topProducts);
        this.updateStockTable(products);
        this.updateDebtsTable(debts);
        this.updateCustomersTable(customers || []);
        this.updateLastUpdateTime();
        this.updateSectionTotals(summary);
    }
    
    // UPDATE SECTION TOTALS
    updateSectionTotals(summary) {
        const salesTotal = document.getElementById('salesTotal');
        const stockTotal = document.getElementById('stockTotal');
        const debtTotal = document.getElementById('debtTotal');
        const topProductsTotal = document.getElementById('topProductsTotal');
        const customersTotal = document.getElementById('customersTotal');
        const analysisTotal = document.getElementById('analysisTotal');
        
        if (salesTotal) salesTotal.textContent = `Total: ₦${(summary.totalSales || 0).toLocaleString()}`;
        if (stockTotal) stockTotal.textContent = `Total Value: ₦${(summary.totalStockValue || 0).toLocaleString()}`;
        if (debtTotal) debtTotal.textContent = `Total Owing: ₦${(summary.totalDebt || 0).toLocaleString()}`;
        if (topProductsTotal) topProductsTotal.textContent = `Top ${Math.min(this.businessData.topProducts?.length || 0, 10)} Products`;
        if (customersTotal) customersTotal.textContent = `Top ${Math.min(this.businessData.customers?.length || 0, 10)}`;
        if (analysisTotal) analysisTotal.textContent = `${summary.transactionCount || 0} transactions analyzed`;
    }
    
    // FIXED: This was causing the error
    updateBigNumbers(summary, salesAnalysis) {
        const totalSalesEl = document.getElementById('totalSales');
        const productsSoldEl = document.getElementById('productsSold');
        const staffCountEl = document.getElementById('staffCount');
        const totalDebtEl = document.getElementById('totalDebt');
        const transactionCountEl = document.getElementById('transactionCount');
        const averageSaleEl = document.getElementById('averageSale');
        const customerCountEl = document.getElementById('customerCount');
        const profitMarginEl = document.getElementById('profitMargin');
        
        if (totalSalesEl) totalSalesEl.textContent = `₦${(summary?.totalSales || 0).toLocaleString()}`;
        if (productsSoldEl) productsSoldEl.textContent = (summary?.productsSold || 0).toLocaleString();
        if (staffCountEl) staffCountEl.textContent = (summary?.staffCount || 0).toLocaleString();
        if (totalDebtEl) totalDebtEl.textContent = `₦${(summary?.totalDebt || 0).toLocaleString()}`;
        if (transactionCountEl) transactionCountEl.textContent = `${summary?.transactionCount || 0} transactions`;
        if (averageSaleEl) averageSaleEl.textContent = `Avg: ₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`;
        if (customerCountEl) customerCountEl.textContent = `${summary?.activeCustomers || 0} customers`; // FIXED LINE
        if (profitMarginEl) profitMarginEl.textContent = `Margin: ${summary?.profitMargin || '0'}%`;
    }
    
    updateStockAlert(stock) {
        const statusText = document.getElementById('stockStatusText');
        const stockMessage = document.getElementById('stockMessage');
        const criticalCount = document.getElementById('criticalCount');
        const warningCount = document.getElementById('warningCount');
        const goodCount = document.getElementById('goodCount');
        
        if (statusText) {
            statusText.textContent = (stock?.status || 'unknown').toUpperCase();
        }
        
        if (stockMessage) {
            let msg = 'Analyzing inventory...';
            if (stock?.critical?.length > 0) {
                msg = `🚨 ${stock.critical.length} products need immediate restock`;
            } else if (stock?.warning?.length > 0) {
                msg = `⚠️ ${stock.warning.length} products running low`;
            } else if (stock?.good?.length > 0) {
                msg = '✅ All stock levels are good';
            }
            stockMessage.textContent = msg;
        }
        
        if (criticalCount) {
            criticalCount.textContent = `${stock?.critical?.length || 0} critical`;
            criticalCount.style.display = stock?.critical?.length > 0 ? 'inline-block' : 'none';
        }
        if (warningCount) {
            warningCount.textContent = `${stock?.warning?.length || 0} warning`;
            warningCount.style.display = stock?.warning?.length > 0 ? 'inline-block' : 'none';
        }
        if (goodCount) {
            goodCount.textContent = `${stock?.good?.length || 0} good`;
            goodCount.style.display = stock?.good?.length > 0 ? 'inline-block' : 'none';
        }
    }
    
    updateSalesAnalysis(salesAnalysis) {
        const peakHourEl = document.getElementById('peakHour');
        const peakHourAmountEl = document.getElementById('peakHourAmount');
        const averageSaleAmountEl = document.getElementById('averageSaleAmount');
        const topReasonEl = document.getElementById('topReason');
        const reasonCountEl = document.getElementById('reasonCount');
        const profitMarginPercentEl = document.getElementById('profitMarginPercent');
        const totalProfitEl = document.getElementById('totalProfit');
        const analysisTotalEl = document.getElementById('analysisTotal');
        
        if (peakHourEl) peakHourEl.textContent = salesAnalysis.peakHour?.formattedHour || 'N/A';
        if (peakHourAmountEl) peakHourAmountEl.textContent = `₦${(salesAnalysis.peakHour?.amount || 0).toLocaleString()}`;
        if (averageSaleAmountEl) averageSaleAmountEl.textContent = `₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`;
        if (topReasonEl) topReasonEl.textContent = salesAnalysis.topReason?.reason || 'Regular Sale';
        if (reasonCountEl) reasonCountEl.textContent = `${salesAnalysis.topReason?.count || 0} sales`;
        if (profitMarginPercentEl) profitMarginPercentEl.textContent = `${salesAnalysis?.profitMargin || '0'}%`;
        if (totalProfitEl) totalProfitEl.textContent = `₦${Math.round(salesAnalysis?.totalProfit || 0).toLocaleString()} profit`;
        if (analysisTotalEl) analysisTotalEl.textContent = `${salesAnalysis?.transactionCount || 0} transactions analyzed`;
    }
    
    updateLastUpdateTime() {
        const updateTimeEl = document.getElementById('updateTime');
        if (updateTimeEl && this.businessData?.summary?.lastUpdate) {
            const lastUpdate = new Date(this.businessData.summary.lastUpdate);
            updateTimeEl.textContent = lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    }
    
    updateSalesTable(sales) {
        const tbody = document.getElementById('salesTableBody');
        const totalEl = document.getElementById('salesTotal');
        
        if (!tbody) return;
        
        if (!sales || sales.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    📭 No sales recorded today yet
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Total: ₦0';
            return;
        }
        
        let html = '';
        const total = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        
        sales.slice(0, 15).forEach(sale => {
            html += `
                <tr>
                    <td><strong>${sale.time || 'N/A'}</strong></td>
                    <td>${sale.customer_name || 'Customer'}</td>
                    <td>${sale.product_name || 'Product'}</td>
                    <td style="text-align: center;">${sale.quantity || 0}</td>
                    <td>₦${(sale.total_price || 0).toLocaleString()}</td>
                    <td><span class="payment-method">${sale.payment_method || 'cash'}</span></td>
                    <td><span class="sale-reason">${sale.reason || 'Sale'}</span></td>
                    <td style="color: #10b981;">₦${Math.round((sale.total_profit || 0)).toLocaleString()}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Total: ₦${total.toLocaleString()}`;
    }
    
    updateTopProductsTable(products) {
        const tbody = document.getElementById('topProductsTableBody');
        const totalEl = document.getElementById('topProductsTotal');
        
        if (!tbody) return;
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    📦 No product data available
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Top 0 Products';
            return;
        }
        
        let html = '';
        
        products.slice(0, 10).forEach((product, index) => {
            const qty = product.current_qty || 0;
            const price = product.retail_price || 0;
            const status = qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' :
                          qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good';
            
            const reorderNeeded = qty <= CEO_CONFIG.STOCK_WARNING ? 'YES' : 'NO';
            const stockValue = qty * price;
            const turnoverRate = product.turnover_rate || 0;
            
            html += `
                <tr>
                    <td><strong>${product.name || 'Product'}</strong></td>
                    <td style="text-align: center;">${qty}</td>
                    <td style="text-align: center;">${product.sold_today || 0}</td>
                    <td>₦${stockValue.toLocaleString()}</td>
                    <td style="text-align: center;">${turnoverRate.toFixed(1)}%</td>
                    <td><span class="reorder-${reorderNeeded === 'YES' ? 'needed' : 'ok'}">${reorderNeeded}</span></td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Top ${Math.min(products.length, 10)} Products`;
    }
    
    updateStockTable(products) {
        const tbody = document.getElementById('stockTableBody');
        const totalEl = document.getElementById('stockTotal');
        
        if (!tbody) return;
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    📭 No products in inventory
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Total Value: ₦0';
            return;
        }
        
        let html = '';
        let totalValue = 0;
        
        products.slice(0, 15).forEach(p => {
            const qty = p.current_qty || 0;
            const price = p.retail_price || 0;
            const value = qty * price;
            totalValue += value;
            
            let status = 'good';
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) status = 'critical';
            else if (qty <= CEO_CONFIG.STOCK_WARNING) status = 'warning';
            
            html += `
                <tr>
                    <td><strong>${p.name || 'Product'}</strong></td>
                    <td style="text-align: center;">${qty}</td>
                    <td style="text-align: center;">${p.min_qty || CEO_CONFIG.STOCK_WARNING}</td>
                    <td>₦${price.toLocaleString()}</td>
                    <td>₦${value.toLocaleString()}</td>
                    <td style="text-align: center;">${status.toUpperCase()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Total Value: ₦${totalValue.toLocaleString()}`;
    }
    
    updateDebtsTable(debts) {
        const tbody = document.getElementById('debtsTableBody');
        const totalEl = document.getElementById('debtTotal');
        
        if (!tbody) return;
        
        if (!debts || debts.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #10b981;">
                    ✅ No outstanding debts
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Total Owing: ₦0';
            return;
        }
        
        let html = '';
        const total = debts.reduce((sum, d) => sum + (d.amount_owing || 0), 0);
        
        debts.slice(0, 15).forEach(debt => {
            const days = debt.days_owing || 0;
            let overdueClass = '';
            if (days > 90) overdueClass = 'overdue-severe';
            else if (days > 30) overdueClass = 'overdue-high';
            
            html += `
                <tr class="${overdueClass}">
                    <td>${debt.customer_name || 'Customer'}</td>
                    <td>Product</td>
                    <td>₦${(debt.amount_owing || 0).toLocaleString()}</td>
                    <td style="text-align: center;">${days} days</td>
                    <td>₦${(debt.interest_accrued || 0).toLocaleString()}</td>
                    <td><strong>₦${(debt.total_due || debt.amount_owing || 0).toLocaleString()}</strong></td>
                    <td>${debt.customer_phone || 'N/A'}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Total Owing: ₦${total.toLocaleString()}`;
    }
    
    updateCustomersTable(customers) {
        const tbody = document.getElementById('customersTableBody');
        const totalEl = document.getElementById('customersTotal');
        
        if (!tbody) return;
        
        if (!customers || customers.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    👤 No customer data available
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Top 0';
            return;
        }
        
        let html = '';
        
        customers.slice(0, 10).forEach(customer => {
            const lastPurchase = customer.last_purchase ? 
                new Date(customer.last_purchase).toLocaleDateString() : 'Never';
            
            html += `
                <tr>
                    <td><strong>${customer.name || 'Customer'}</strong></td>
                    <td>₦${(customer.total_spent || 0).toLocaleString()}</td>
                    <td style="text-align: center;">${customer.purchase_count || 0}</td>
                    <td>₦${Math.round((customer.total_spent || 0) / Math.max(customer.purchase_count || 1, 1)).toLocaleString()}</td>
                    <td>${lastPurchase}</td>
                    <td>${customer.phone || 'N/A'}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Top ${Math.min(customers.length, 10)}`;
    }
    
    // PDF REPORT - COMPLETE VERSION WITH ALL CALCULATIONS
    async generatePDFReport() {
        try {
            if (!this.businessData) {
                this.showMessage('Please wait for data to load', 'info');
                return;
            }
            
            this.showMessage('Generating comprehensive PDF report...', 'info');
            
            // Check if jsPDF is available
            if (typeof jspdf === 'undefined') {
                // Load jsPDF
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => this.createFullPDF();
                document.head.appendChild(script);
            } else {
                this.createFullPDF();
            }
            
        } catch (error) {
            console.error('PDF generation error:', error);
            this.showMessage('Failed to generate PDF', 'error');
        }
    }
    
    createFullPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const pageWidth = doc.internal.pageSize.width;
            let yPosition = 20;
            
            // COMPANY HEADER
            doc.setFontSize(24);
            doc.setTextColor(0, 75, 147);
            doc.text('ARIJEEM ENTERPRISES', pageWidth / 2, yPosition, { align: 'center' });
            
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.text('CEO BUSINESS REPORT', pageWidth / 2, yPosition + 10, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            const reportDate = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            doc.text(`Report Date: ${reportDate}`, pageWidth / 2, yPosition + 18, { align: 'center' });
            
            yPosition = 50;
            
            // EXECUTIVE SUMMARY WITH ALL CALCULATIONS
            doc.setFontSize(16);
            doc.setTextColor(0, 75, 147);
            doc.text('EXECUTIVE SUMMARY', 20, yPosition);
            
            yPosition += 10;
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            
            const summary = this.businessData.summary;
            const salesAnalysis = this.businessData.salesAnalysis;
            const products = this.businessData.products || [];
            
            const totalStockValue = products.reduce((sum, p) => sum + (p.stock_value || 0), 0);
            const totalProducts = products.length;
            const totalLowStock = products.filter(p => (p.current_qty || 0) <= CEO_CONFIG.STOCK_WARNING).length;
            
            const summaryData = [
                `Total Sales Today: ₦${(summary.totalSales || 0).toLocaleString()}`,
                `Products Sold: ${summary.productsSold || 0} units`,
                `Transaction Count: ${summary.transactionCount || 0}`,
                `Average Sale: ₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`,
                `Total Profit: ₦${Math.round(salesAnalysis?.totalProfit || 0).toLocaleString()}`,
                `Profit Margin: ${summary.profitMargin || '0'}%`,
                `Total Stock Value: ₦${totalStockValue.toLocaleString()}`,
                `Products in Inventory: ${totalProducts}`,
                `Products Need Restock: ${totalLowStock}`,
                `Report Generated: ${this.businessData.summary?.lastUpdate ? new Date(this.businessData.summary.lastUpdate).toLocaleString() : 'Just now'}`
            ];
            
            summaryData.forEach((item, index) => {
                doc.text(item, 30, yPosition + (index * 8));
            });
            
            yPosition += 100;
            
            // SALES DATA SECTION WITH PRICES
            if (this.businessData.sales && this.businessData.sales.length > 0) {
                doc.addPage();
                yPosition = 20;
                
                doc.setFontSize(16);
                doc.setTextColor(0, 75, 147);
                doc.text('TODAY\'S SALES DETAILS WITH PRICING', 20, yPosition);
                
                yPosition += 10;
                doc.setFontSize(9);
                
                // Sales table header
                doc.text('Time', 10, yPosition);
                doc.text('Customer', 25, yPosition);
                doc.text('Product', 50, yPosition);
                doc.text('Qty', 90, yPosition);
                doc.text('Unit Price', 100, yPosition);
                doc.text('Total', 125, yPosition);
                doc.text('Profit', 145, yPosition);
                doc.text('Margin', 165, yPosition);
                doc.text('Payment', 180, yPosition);
                
                yPosition += 5;
                doc.line(10, yPosition, 190, yPosition);
                yPosition += 5;
                
                // Sales table rows
                this.businessData.sales.slice(0, 25).forEach((sale, index) => {
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    doc.text(sale.time || 'N/A', 10, yPosition);
                    doc.text((sale.customer_name || 'Customer').substring(0, 10), 25, yPosition);
                    doc.text((sale.product_name || 'Product').substring(0, 15), 50, yPosition);
                    doc.text((sale.quantity || 0).toString(), 90, yPosition);
                    doc.text(`₦${(sale.unit_price || 0).toLocaleString()}`, 100, yPosition);
                    doc.text(`₦${(sale.total_price || 0).toLocaleString()}`, 125, yPosition);
                    doc.text(`₦${Math.round(sale.total_profit || 0).toLocaleString()}`, 145, yPosition);
                    doc.text(`${sale.margin_percent || '0'}%`, 165, yPosition);
                    doc.text(sale.payment_method || 'cash', 180, yPosition);
                    
                    yPosition += 7;
                });
            }
            
            // PRODUCT INVENTORY WITH PRICING
            if (products.length > 0) {
                doc.addPage();
                yPosition = 20;
                
                doc.setFontSize(16);
                doc.setTextColor(0, 75, 147);
                doc.text('PRODUCT INVENTORY WITH PRICING', 20, yPosition);
                
                yPosition += 10;
                doc.setFontSize(9);
                
                // Stock analysis
                const stock = this.businessData.stock;
                doc.text(`Total Stock Value: ₦${totalStockValue.toLocaleString()}`, 30, yPosition);
                doc.text(`Critical Items: ${stock.critical?.length || 0}`, 30, yPosition + 7);
                doc.text(`Warning Items: ${stock.warning?.length || 0}`, 30, yPosition + 14);
                doc.text(`Good Items: ${stock.good?.length || 0}`, 30, yPosition + 21);
                
                yPosition += 35;
                
                // Products table header
                doc.text('Product Name', 10, yPosition);
                doc.text('Stock', 60, yPosition);
                doc.text('Retail Price', 75, yPosition);
                doc.text('Wholesale', 100, yPosition);
                doc.text('Stock Value', 125, yPosition);
                doc.text('Sold Today', 150, yPosition);
                doc.text('Turnover', 170, yPosition);
                doc.text('Status', 185, yPosition);
                
                yPosition += 5;
                doc.line(10, yPosition, 190, yPosition);
                yPosition += 5;
                
                // Products table rows
                products.slice(0, 25).forEach((product, index) => {
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    const qty = product.current_qty || 0;
                    const retailPrice = product.retail_price || 0;
                    const wholesalePrice = product.wholesale_price || (retailPrice * 0.85);
                    const stockValue = qty * retailPrice;
                    const soldToday = product.sold_today || 0;
                    const turnoverRate = product.turnover_rate || 0;
                    let status = 'Good';
                    if (qty <= CEO_CONFIG.STOCK_CRITICAL) status = 'Critical';
                    else if (qty <= CEO_CONFIG.STOCK_WARNING) status = 'Warning';
                    
                    doc.text((product.name || 'Product').substring(0, 20), 10, yPosition);
                    doc.text(qty.toString(), 60, yPosition);
                    doc.text(`₦${retailPrice.toLocaleString()}`, 75, yPosition);
                    doc.text(`₦${wholesalePrice.toLocaleString()}`, 100, yPosition);
                    doc.text(`₦${stockValue.toLocaleString()}`, 125, yPosition);
                    doc.text(soldToday.toString(), 150, yPosition);
                    doc.text(`${turnoverRate.toFixed(1)}%`, 170, yPosition);
                    doc.text(status.substring(0, 3), 185, yPosition);
                    
                    yPosition += 7;
                });
            }
            
            // TOP PERFORMING PRODUCTS
            if (this.businessData.topProducts && this.businessData.topProducts.length > 0) {
                doc.addPage();
                yPosition = 20;
                
                doc.setFontSize(16);
                doc.setTextColor(0, 75, 147);
                doc.text('TOP PERFORMING PRODUCTS', 20, yPosition);
                
                yPosition += 10;
                doc.setFontSize(10);
                
                this.businessData.topProducts.slice(0, 15).forEach((product, index) => {
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    const rank = index + 1;
                    const stockValue = product.stock_value || 0;
                    const performance = ((product.sold_today || 0) * (product.retail_price || 0)) / Math.max(product.current_qty || 1, 1);
                    
                    doc.text(`${rank}. ${product.name || 'Product'}`, 30, yPosition);
                    doc.text(`Stock: ${product.current_qty || 0} | Value: ₦${stockValue.toLocaleString()}`, 30, yPosition + 7);
                    doc.text(`Sold Today: ${product.sold_today || 0} | Performance: ${performance.toFixed(1)}`, 30, yPosition + 14);
                    
                    yPosition += 25;
                });
            }
            
            // CRITICAL STOCK ALERTS
            const criticalProducts = products.filter(p => (p.current_qty || 0) <= CEO_CONFIG.STOCK_CRITICAL);
            if (criticalProducts.length > 0) {
                doc.addPage();
                yPosition = 20;
                
                doc.setFontSize(16);
                doc.setTextColor(255, 0, 0);
                doc.text('🚨 CRITICAL STOCK ALERTS', 20, yPosition);
                
                yPosition += 10;
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                
                criticalProducts.forEach((product, index) => {
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    const currentValue = (product.current_qty || 0) * (product.retail_price || 0);
                    const minValue = (product.min_qty || CEO_CONFIG.STOCK_WARNING) * (product.retail_price || 0);
                    
                    doc.text(`• ${product.name || 'Product'}`, 30, yPosition);
                    doc.text(`  Current: ${product.current_qty || 0} units (₦${currentValue.toLocaleString()})`, 35, yPosition + 7);
                    doc.text(`  Minimum Required: ${product.min_qty || CEO_CONFIG.STOCK_WARNING} units (₦${minValue.toLocaleString()})`, 35, yPosition + 14);
                    
                    yPosition += 25;
                });
            }
            
            // FOOTER
            const lastPage = doc.internal.getNumberOfPages();
            doc.setPage(lastPage);
            yPosition = doc.internal.pageSize.height - 20;
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Arijeem Insight 360 - CEO Dashboard Report', pageWidth / 2, yPosition, { align: 'center' });
            doc.text('All prices calculated based on market rates and historical data', pageWidth / 2, yPosition + 7, { align: 'center' });
            doc.text('Confidential - For Executive Use Only', pageWidth / 2, yPosition + 14, { align: 'center' });
            
            // Save PDF
            const filename = `Arijeem-CEO-Report-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            this.showMessage(`✅ Comprehensive PDF report generated: ${filename}`, 'success');
            
        } catch (error) {
            console.error('PDF creation error:', error);
            this.showMessage('Failed to create PDF', 'error');
        }
    }
    
    // LOGOUT
    logoutCEO() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('ceo_user');
            localStorage.removeItem('ceo_email');
            this.currentCEO = null;
            this.businessData = null;
            
            if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
            
            this.showCreateAccountScreen();
            this.showMessage('Logged out successfully', 'success');
        }
    }
    
    // AUTO-LOGIN
    checkAutoLogin() {
        const userStr = localStorage.getItem('ceo_user');
        const email = localStorage.getItem('ceo_email');
        
        if (userStr && email) {
            try {
                this.currentCEO = JSON.parse(userStr);
                this.showDashboard();
                this.loadBusinessData();
                this.showMessage(`Welcome back, ${this.currentCEO.name}!`, 'success');
            } catch (error) {
                console.error('Auto-login error:', error);
                localStorage.clear();
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CEO Dashboard starting...');
    window.ceoDashboard = new CEODashboard();
    window.ceoDashboard.showCreateAccountScreen();
    console.log('✅ CEO Dashboard started successfully');
});
