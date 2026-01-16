// CEO DASHBOARD CONTROLLER - COMPLETE WORKING VERSION WITH FIXED PDF
console.log('👑 Starting CEO Dashboard...');

class CEODashboard {
    constructor() {
        this.currentCEO = null;
        this.businessData = null;
        this.autoSyncTimer = null;
        this.isGeneratingPDF = false;
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Dashboard initializing...');
            
            // Check if dependencies are loaded
            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase not loaded');
                this.showMessage('System error: Database not available', 'error');
                return;
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check for auto-login
            setTimeout(() => this.checkAutoLogin(), 1500);
            
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
        
        // Form submissions
        const createForm = document.getElementById('createForm');
        if (createForm) {
            createForm.onsubmit = (e) => {
                e.preventDefault();
                this.createCEOAccount();
            };
        }
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                this.loginCEO();
            };
        }
    }
    
    startPeriodicUpdates() {
        if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
        
        this.autoSyncTimer = setInterval(() => {
            if (this.currentCEO) {
                this.loadBusinessData(true);
            }
        }, CEO_CONFIG.SYNC_INTERVAL);
    }
    
    // MESSAGE HANDLER
    showMessage(text, type = 'info') {
        try {
            // Remove existing messages
            const existing = document.querySelectorAll('.message');
            existing.forEach(el => el.remove());
            
            // Create new message
            const msg = document.createElement('div');
            msg.className = 'message';
            msg.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: white; padding: 15px 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 5px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'}; z-index: 1000; display: flex; align-items: center; gap: 10px; min-width: 300px;">
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
            
            if (password.length < CEO_CONFIG.PASSWORD_MIN) {
                this.showMessage(`Password must be at least ${CEO_CONFIG.PASSWORD_MIN} characters`, 'error');
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
            
            // Auto login after 1 second
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
        }
        
        // Reset button after 2 seconds
        setTimeout(() => {
            const btn = document.querySelector('#createAccountScreen .btn-primary');
            if (btn) {
                btn.innerHTML = '✅ CREATE ACCOUNT & ACCESS DASHBOARD';
                btn.disabled = false;
            }
        }, 2000);
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
        }
        
        // Reset button
        const btn = document.querySelector('#loginScreen .btn-primary');
        if (btn) {
            btn.innerHTML = '🔑 ACCESS DASHBOARD';
            btn.disabled = false;
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
    
    // LOAD BUSINESS DATA
    async loadBusinessData(silent = false) {
        try {
            if (!silent) {
                this.showLoadingIndicator(true);
                this.hideNoDataMessage();
            }
            
            console.log('🔄 Loading business data...');
            this.businessData = await window.ceoDB.getBusinessData();
            
            console.log('✅ Business data loaded:', {
                sales: this.businessData.sales?.length,
                products: this.businessData.products?.length,
                debts: this.businessData.debts?.length,
                customers: this.businessData.customers?.length
            });
            
            this.updateDashboard();
            this.updateConnectionStatus();
            
            if (!silent) {
                if (this.businessData.sales.length > 0 || this.businessData.products.length > 0) {
                    this.showMessage('Data loaded successfully', 'success');
                } else {
                    this.showNoDataMessage();
                }
            }
            
        } catch (error) {
            console.error('❌ Load business data error:', error);
            if (!silent) {
                this.showMessage('Failed to load data', 'error');
                this.showNoDataMessage();
            }
        }
        
        if (!silent) {
            this.showLoadingIndicator(false);
        }
    }
    
    showLoadingIndicator(show) {
        const loadingEl = document.getElementById('loadingIndicator');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
    }
    
    showNoDataMessage() {
        const noDataEl = document.getElementById('noDataMessage');
        if (noDataEl) {
            noDataEl.style.display = 'block';
        }
    }
    
    hideNoDataMessage() {
        const noDataEl = document.getElementById('noDataMessage');
        if (noDataEl) {
            noDataEl.style.display = 'none';
        }
    }
    
    updateConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        const detailEl = document.getElementById('connectionDetail');
        
        if (this.businessData?.isConnected) {
            if (statusEl) {
                statusEl.textContent = '✅ Connected to Arijeem Insight 360';
                statusEl.className = 'connection-good';
            }
            if (detailEl) {
                detailEl.textContent = `Live data | ${this.businessData.sales.length} sales today | ${this.businessData.products.length} products`;
            }
        } else {
            if (statusEl) {
                statusEl.textContent = '⚠️ Using cached data';
                statusEl.className = 'connection-warning';
            }
            if (detailEl) {
                detailEl.textContent = 'Limited functionality - No active connection';
            }
        }
        
        // Update data freshness
        const freshnessEl = document.getElementById('dataFreshness');
        if (freshnessEl && this.businessData?.summary?.lastUpdate) {
            const lastUpdate = new Date(this.businessData.summary.lastUpdate);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
            
            if (diffMinutes < 5) {
                freshnessEl.textContent = `Data updated ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
                freshnessEl.style.color = '#10b981';
            } else if (diffMinutes < 30) {
                freshnessEl.textContent = `Data updated ${diffMinutes} minutes ago`;
                freshnessEl.style.color = '#f59e0b';
            } else {
                freshnessEl.textContent = `Data updated ${Math.floor(diffMinutes / 60)} hours ago`;
                freshnessEl.style.color = '#ef4444';
            }
        }
    }
    
    // UPDATE DASHBOARD
    updateDashboard() {
        if (!this.businessData) {
            console.log('⚠️ No business data to update');
            return;
        }
        
        const { summary, sales, products, debts, customers, stock, topProducts, salesAnalysis } = this.businessData;
        
        this.updateBigNumbers(summary, salesAnalysis);
        this.updateStockAlert(stock);
        this.updateSalesAnalysis(salesAnalysis);
        this.updateSalesTable(sales);
        this.updateTopProductsTable(topProducts);
        this.updateStockTable(products);
        this.updateDebtsTable(debts);
        this.updateCustomersTable(customers);
        this.updateLastUpdateTime();
        this.updateSectionTotals(summary, products);
    }
    
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
        if (staffCountEl) staffCountEl.textContent = '0'; // Update if you have staff table
        if (totalDebtEl) totalDebtEl.textContent = `₦${(summary?.totalDebt || 0).toLocaleString()}`;
        if (transactionCountEl) transactionCountEl.textContent = `${summary?.transactionCount || 0} transactions`;
        if (averageSaleEl) averageSaleEl.textContent = `Avg: ₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`;
        if (customerCountEl) customerCountEl.textContent = `${summary?.activeCustomers || 0} customers`;
        if (profitMarginEl) profitMarginEl.textContent = `Margin: ${salesAnalysis?.profitMargin || '0'}%`;
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
                msg = `✅ ${stock.good.length} products in good stock`;
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
        
        if (peakHourEl) peakHourEl.textContent = salesAnalysis.peakHour?.formattedHour || '2 PM';
        if (peakHourAmountEl) peakHourAmountEl.textContent = `₦${(salesAnalysis.peakHour?.amount || salesAnalysis.totalSales || 0).toLocaleString()}`;
        if (averageSaleAmountEl) averageSaleAmountEl.textContent = `₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`;
        if (topReasonEl) topReasonEl.textContent = salesAnalysis.topReason || 'Regular Sale';
        if (reasonCountEl) reasonCountEl.textContent = `${salesAnalysis?.transactionCount || 0} sales`;
        if (profitMarginPercentEl) profitMarginPercentEl.textContent = `${salesAnalysis?.profitMargin || '0'}%`;
        if (totalProfitEl) totalProfitEl.textContent = `₦${Math.round(salesAnalysis?.totalProfit || 0).toLocaleString()} profit`;
        if (analysisTotalEl) analysisTotalEl.textContent = `${salesAnalysis?.transactionCount || 0} transactions analyzed`;
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
        
        sales.slice(0, CEO_CONFIG.MAX_ROWS_PER_TABLE).forEach(sale => {
            const profit = (sale.total_price || 0) * 0.3; // 30% profit estimate
            
            html += `
                <tr>
                    <td><strong>${sale.time || 'N/A'}</strong></td>
                    <td>${sale.customer_name || 'Customer'}</td>
                    <td>${sale.product_name || 'Product'}</td>
                    <td style="text-align: center;">${sale.quantity || 0}</td>
                    <td>₦${(sale.total_price || 0).toLocaleString()}</td>
                    <td><span class="payment-method ${sale.payment_method?.toLowerCase() || 'cash'}">${sale.payment_method || 'cash'}</span></td>
                    <td><span class="sale-reason">${sale.reason || 'Sale'}</span></td>
                    <td style="color: #10b981;">₦${Math.round(profit).toLocaleString()}</td>
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
        
        products.slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT).forEach((product, index) => {
            const qty = product.current_qty || 0;
            const price = product.price || 0;
            const status = qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' :
                          qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good';
            
            const reorderNeeded = qty <= CEO_CONFIG.STOCK_WARNING ? 'YES' : 'NO';
            const stockValue = qty * price;
            
            html += `
                <tr>
                    <td><strong>${product.name || 'Product'}</strong></td>
                    <td style="text-align: center;">${qty.toLocaleString()}</td>
                    <td style="text-align: center;">${product.sold_today || 0}</td>
                    <td>₦${stockValue.toLocaleString()}</td>
                    <td style="text-align: center;">${product.turnover_rate || '0'}%</td>
                    <td><span class="reorder-${reorderNeeded === 'YES' ? 'needed' : 'ok'}">${reorderNeeded}</span></td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Top ${Math.min(products.length, CEO_CONFIG.TOP_PRODUCTS_LIMIT)} Products`;
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
        
        products.slice(0, CEO_CONFIG.MAX_ROWS_PER_TABLE).forEach(p => {
            const qty = p.current_qty || 0;
            const price = p.price || 0;
            const value = qty * price;
            totalValue += value;
            
            let status = 'good';
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) status = 'critical';
            else if (qty <= CEO_CONFIG.STOCK_WARNING) status = 'warning';
            
            html += `
                <tr>
                    <td><strong>${p.name || 'Product'}</strong></td>
                    <td style="text-align: center;">${qty.toLocaleString()}</td>
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
        const total = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        debts.slice(0, CEO_CONFIG.MAX_ROWS_PER_TABLE).forEach(debt => {
            const days = debt.days_owing || 0;
            let overdueClass = '';
            if (days > 90) overdueClass = 'overdue-severe';
            else if (days > 30) overdueClass = 'overdue-high';
            
            html += `
                <tr class="${overdueClass}">
                    <td>${debt.customer_name || 'Customer'}</td>
                    <td>Various Products</td>
                    <td>₦${(debt.amount || 0).toLocaleString()}</td>
                    <td style="text-align: center;">${days} days</td>
                    <td>₦${Math.round((debt.amount || 0) * 0.1).toLocaleString()}</td>
                    <td><strong>₦${(debt.amount || 0).toLocaleString()}</strong></td>
                    <td>${debt.phone || 'N/A'}</td>
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
        
        customers.slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT).forEach(customer => {
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
        if (totalEl) totalEl.textContent = `Top ${Math.min(customers.length, CEO_CONFIG.TOP_PRODUCTS_LIMIT)}`;
    }
    
    updateSectionTotals(summary, products) {
        const salesTotal = document.getElementById('salesTotal');
        const stockTotal = document.getElementById('stockTotal');
        const debtTotal = document.getElementById('debtTotal');
        const topProductsTotal = document.getElementById('topProductsTotal');
        const customersTotal = document.getElementById('customersTotal');
        const analysisTotal = document.getElementById('analysisTotal');
        
        if (salesTotal) salesTotal.textContent = `Total: ₦${(summary.totalSales || 0).toLocaleString()}`;
        if (stockTotal) {
            const stockValue = products.reduce((sum, p) => {
                const qty = p.current_qty || 0;
                const price = p.price || 0;
                return sum + (qty * price);
            }, 0);
            stockTotal.textContent = `Total Value: ₦${stockValue.toLocaleString()}`;
        }
        if (debtTotal) debtTotal.textContent = `Total Owing: ₦${(summary.totalDebt || 0).toLocaleString()}`;
        if (topProductsTotal) topProductsTotal.textContent = `Top ${Math.min(this.businessData.topProducts?.length || 0, CEO_CONFIG.TOP_PRODUCTS_LIMIT)} Products`;
        if (customersTotal) customersTotal.textContent = `Top ${Math.min(this.businessData.customers?.length || 0, CEO_CONFIG.TOP_PRODUCTS_LIMIT)}`;
        if (analysisTotal) analysisTotal.textContent = `${summary.transactionCount || 0} transactions analyzed`;
    }
    
    updateLastUpdateTime() {
        const updateTimeEl = document.getElementById('updateTime');
        if (updateTimeEl) {
            updateTimeEl.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
            
            this.showMessage('Refreshing data from Arijeem Insight 360...', 'info');
            
            // Test connection
            const connected = await window.ceoDB.forceRefresh();
            
            if (connected) {
                await this.loadBusinessData();
                this.showMessage('Data refreshed successfully!', 'success');
            } else {
                this.showMessage('Could not connect to main system', 'warning');
            }
            
        } catch (error) {
            console.error('Force refresh error:', error);
            this.showMessage('Refresh failed', 'error');
        }
        
        setTimeout(() => {
            const refreshBtn = document.querySelector('.btn-refresh');
            if (refreshBtn) {
                refreshBtn.innerHTML = '🔄 REFRESH NOW';
                refreshBtn.disabled = false;
            }
        }, 2000);
    }
    
    // PDF REPORT GENERATION - FIXED VERSION (NO SYMBOL MIXING)
    async generatePDFReport() {
        if (this.isGeneratingPDF) return;
        
        this.isGeneratingPDF = true;
        
        try {
            if (!this.businessData) {
                this.showMessage('Please load data first', 'info');
                await this.loadBusinessData();
            }
            
            // Show PDF loading overlay
            const pdfLoading = document.getElementById('pdfLoading');
            if (pdfLoading) pdfLoading.style.display = 'flex';
            
            this.showMessage('Generating professional PDF report...', 'info');
            
            // Load jsPDF if not available
            if (typeof jspdf === 'undefined') {
                await this.loadJSPDF();
            }
            
            // Load AutoTable plugin if not available
            await this.loadAutoTablePlugin();
            
            // Generate clean PDF with proper formatting
            await this.createCleanPDFReport();
            
            this.showMessage('✅ Professional PDF report generated successfully!', 'success');
            
        } catch (error) {
            console.error('PDF generation error:', error);
            this.showMessage('Failed to generate PDF. Please try again.', 'error');
        }
        
        // Hide PDF loading overlay
        const pdfLoading = document.getElementById('pdfLoading');
        if (pdfLoading) pdfLoading.style.display = 'none';
        
        this.isGeneratingPDF = false;
    }
    
    async loadJSPDF() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async loadAutoTablePlugin() {
        return new Promise((resolve, reject) => {
            if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // ULTRA STRONG TEXT CLEANING FUNCTION - FIXES & SYMBOL ISSUE
    cleanTextForPDF(text) {
        if (!text && text !== 0) return 'N/A';
        
        // Convert to string
        let str = String(text);
        
        // Remove ALL special symbols except basic punctuation
        str = str.replace(/[&]/g, 'and'); // Replace & with 'and'
        str = str.replace(/[^\w\s.,-]/g, ''); // Remove everything except letters, numbers, spaces, ., ,, -
        str = str.replace(/\s+/g, ' '); // Replace multiple spaces with single space
        str = str.trim();
        
        // Limit length for PDF cells
        if (str.length > 40) {
            str = str.substring(0, 37) + '...';
        }
        
        return str || 'N/A';
    }
    
    // Format currency properly for PDF
    formatCurrencyForPDF(amount) {
        if (!amount && amount !== 0) return '₦0';
        return `₦${Math.round(Number(amount)).toLocaleString()}`;
    }
    
    // Get clean data for PDF
    getPDFData() {
        const { summary, salesAnalysis, products, sales, debts, customers } = this.businessData;
        
        // Calculate totals
        const totalStockValue = products.reduce((sum, p) => {
            const qty = p.current_qty || p.quantity || 0;
            const price = p.price || p.selling_price || 0;
            return sum + (qty * price);
        }, 0);
        
        const actualTotalSales = summary?.totalSales || sales.reduce((sum, s) => sum + (s.total_price || s.amount || 0), 0);
        const actualProductsSold = summary?.productsSold || sales.reduce((sum, s) => sum + (s.quantity || 1), 0);
        const actualTotalDebt = summary?.totalDebt || debts.reduce((sum, d) => sum + (d.amount || d.amount_owing || 0), 0);
        const actualTransactionCount = summary?.transactionCount || sales.length;
        const actualCustomerCount = summary?.activeCustomers || customers.length;
        const actualProfit = Math.round(salesAnalysis?.totalProfit || (actualTotalSales * 0.3));
        const actualAverageSale = Math.round(salesAnalysis?.averageSale || (actualTotalSales / Math.max(actualTransactionCount, 1)));
        const actualProfitMargin = salesAnalysis?.profitMargin || '30';
        
        return {
            summary: {
                totalSales: actualTotalSales,
                productsSold: actualProductsSold,
                totalDebt: actualTotalDebt,
                transactionCount: actualTransactionCount,
                customerCount: actualCustomerCount,
                stockValue: totalStockValue,
                profit: actualProfit,
                profitMargin: actualProfitMargin,
                averageSale: actualAverageSale
            },
            products: products.slice(0, CEO_CONFIG.MAX_PDF_PRODUCTS || 30).map(p => ({
                name: this.cleanTextForPDF(p.name),
                quantity: p.current_qty || 0,
                minQty: p.min_qty || CEO_CONFIG.STOCK_WARNING,
                price: p.price || p.selling_price || 0,
                value: (p.current_qty || 0) * (p.price || p.selling_price || 0),
                status: this.getStockStatus(p.current_qty || 0)
            })),
            sales: sales.slice(0, 50).map(s => ({
                time: s.time || new Date(s.sale_date || s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                customer: this.cleanTextForPDF(s.customer_name),
                product: this.cleanTextForPDF(s.product_name),
                quantity: s.quantity || 1,
                amount: s.total_price || s.amount || 0,
                payment: this.cleanTextForPDF(s.payment_method),
                profit: Math.round((s.total_price || 0) * 0.3)
            })),
            debts: debts.slice(0, 50).map(d => ({
                customer: this.cleanTextForPDF(d.customer_name),
                amount: d.amount || d.amount_owing || 0,
                days: d.days_owing || this.calculateDaysOwing(d.created_at),
                phone: this.cleanTextForPDF(d.phone),
                priority: this.getDebtPriority(d.days_owing || 0)
            })),
            customers: customers.slice(0, 20).map(c => ({
                name: this.cleanTextForPDF(c.name),
                totalSpent: c.total_spent || 0,
                visits: c.purchase_count || 0,
                averageSpend: Math.round((c.total_spent || 0) / Math.max(c.purchase_count || 1, 1)),
                lastVisit: c.last_purchase ? new Date(c.last_purchase).toLocaleDateString() : 'Never',
                phone: this.cleanTextForPDF(c.phone)
            }))
        };
    }
    
    getStockStatus(quantity) {
        if (quantity <= CEO_CONFIG.STOCK_CRITICAL) return 'CRITICAL';
        if (quantity <= CEO_CONFIG.STOCK_WARNING) return 'LOW';
        return 'GOOD';
    }
    
    getDebtPriority(days) {
        if (days > 90) return 'SEVERE';
        if (days > 30) return 'HIGH';
        return 'NORMAL';
    }
    
    calculateDaysOwing(dateString) {
        if (!dateString) return 0;
        try {
            const debtDate = new Date(dateString);
            const today = new Date();
            const diffTime = Math.abs(today - debtDate);
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (e) {
            return 0;
        }
    }
    
    async createCleanPDFReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        
        // Get clean data
        const pdfData = this.getPDFData();
        const reportDate = new Date();
        
        // ===== PAGE 1: EXECUTIVE SUMMARY =====
        // Header
        doc.setFillColor(0, 75, 147);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text('ARIJEEM ENTERPRISES', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(18);
        doc.text('CEO BUSINESS REPORT', pageWidth / 2, 30, { align: 'center' });
        
        let yPos = 50;
        
        // Report Info
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Report Date: ${reportDate.toLocaleDateString('en-NG')}`, margin, yPos);
        doc.text(`Report Time: ${reportDate.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, yPos, { align: 'right' });
        
        yPos += 15;
        
        // Executive Summary Title
        doc.setFontSize(16);
        doc.setTextColor(0, 75, 147);
        doc.text('EXECUTIVE SUMMARY', margin, yPos);
        
        yPos += 10;
        
        // Summary Table - NO SYMBOLS mixed with text
        const summaryData = [
            ['Business Metric', 'Value'],
            ['Total Sales Today', this.formatCurrencyForPDF(pdfData.summary.totalSales)],
            ['Products Sold Today', pdfData.summary.productsSold.toLocaleString()],
            ['Sales Transactions', pdfData.summary.transactionCount.toLocaleString()],
            ['Average Sale Value', this.formatCurrencyForPDF(pdfData.summary.averageSale)],
            ['Total Profit', this.formatCurrencyForPDF(pdfData.summary.profit)],
            ['Profit Margin', pdfData.summary.profitMargin + '%'],
            ['Stock Value', this.formatCurrencyForPDF(pdfData.summary.stockValue)],
            ['Products in Stock', pdfData.products.length.toLocaleString()],
            ['Outstanding Debts', this.formatCurrencyForPDF(pdfData.summary.totalDebt)],
            ['Active Customers', pdfData.summary.customerCount.toLocaleString()]
        ];
        
        doc.autoTable({
            startY: yPos,
            head: [summaryData[0]],
            body: summaryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [0, 75, 147], textColor: [255, 255, 255], fontSize: 11 },
            bodyStyles: { fontSize: 10 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: margin, right: margin }
        });
        
        // ===== PAGE 2: SALES DETAILS =====
        if (pdfData.sales.length > 0) {
            doc.addPage();
            yPos = 20;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 75, 147);
            doc.text('TODAYS SALES DETAILS', margin, yPos);
            
            yPos += 10;
            
            // Prepare sales data for table - NO SYMBOLS in cells
            const salesTableData = pdfData.sales.map(sale => [
                sale.time,
                sale.customer,
                sale.product,
                sale.quantity,
                this.formatCurrencyForPDF(sale.amount),
                sale.payment,
                this.formatCurrencyForPDF(sale.profit)
            ]);
            
            salesTableData.unshift(['Time', 'Customer', 'Product', 'Qty', 'Amount', 'Payment', 'Profit']);
            
            doc.autoTable({
                startY: yPos,
                head: [salesTableData[0]],
                body: salesTableData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [0, 75, 147], textColor: [255, 255, 255], fontSize: 10 },
                bodyStyles: { fontSize: 9 },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                margin: { left: margin, right: margin },
                pageBreak: 'auto',
                styles: { overflow: 'linebreak', cellWidth: 'wrap' }
            });
        }
        
        // ===== PAGE 3: STOCK INVENTORY =====
        if (pdfData.products.length > 0) {
            doc.addPage();
            yPos = 20;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 75, 147);
            doc.text('STOCK INVENTORY REPORT', margin, yPos);
            
            yPos += 10;
            
            // Stock Summary
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            
            const criticalCount = pdfData.products.filter(p => p.status === 'CRITICAL').length;
            const lowCount = pdfData.products.filter(p => p.status === 'LOW').length;
            const goodCount = pdfData.products.filter(p => p.status === 'GOOD').length;
            
            doc.text(`Total Products: ${pdfData.products.length}`, margin, yPos);
            doc.text(`Critical Stock: ${criticalCount}`, margin + 70, yPos);
            doc.text(`Low Stock: ${lowCount}`, margin + 140, yPos);
            yPos += 8;
            doc.text(`Good Stock: ${goodCount}`, margin, yPos);
            doc.text(`Total Stock Value: ${this.formatCurrencyForPDF(pdfData.summary.stockValue)}`, margin + 70, yPos);
            
            yPos += 15;
            
            // Prepare stock data for table - NO SYMBOLS in cells
            const stockTableData = pdfData.products.map(product => [
                product.name,
                product.quantity.toLocaleString(),
                product.minQty.toLocaleString(),
                this.formatCurrencyForPDF(product.price),
                this.formatCurrencyForPDF(product.value),
                product.status,
                product.quantity <= product.minQty ? 'YES' : 'NO'
            ]);
            
            stockTableData.unshift(['Product Name', 'Current Stock', 'Min Level', 'Unit Price', 'Stock Value', 'Status', 'Reorder']);
            
            doc.autoTable({
                startY: yPos,
                head: [stockTableData[0]],
                body: stockTableData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [0, 75, 147], textColor: [255, 255, 255], fontSize: 10 },
                bodyStyles: { fontSize: 9 },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                margin: { left: margin, right: margin },
                pageBreak: 'auto',
                styles: { overflow: 'linebreak', cellWidth: 'wrap' },
                willDrawCell: (data) => {
                    // Color code status cells
                    if (data.column.index === 5) {
                        const status = data.cell.raw;
                        if (status === 'CRITICAL') {
                            doc.setFillColor(254, 226, 226);
                            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            doc.setTextColor(220, 38, 38);
                        } else if (status === 'LOW') {
                            doc.setFillColor(254, 243, 199);
                            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            doc.setTextColor(217, 119, 6);
                        }
                    }
                }
            });
        }
        
        // ===== PAGE 4: DEBTS & CUSTOMERS =====
        if (pdfData.debts.length > 0 || pdfData.customers.length > 0) {
            doc.addPage();
            yPos = 20;
            
            // Outstanding Debts
            if (pdfData.debts.length > 0) {
                doc.setFontSize(16);
                doc.setTextColor(0, 75, 147);
                doc.text('OUTSTANDING DEBTS', margin, yPos);
                
                yPos += 10;
                
                const debtsTableData = pdfData.debts.map(debt => [
                    debt.customer,
                    this.formatCurrencyForPDF(debt.amount),
                    debt.days + ' days',
                    debt.phone,
                    debt.priority
                ]);
                
                debtsTableData.unshift(['Customer', 'Amount Owed', 'Days Owing', 'Contact', 'Priority']);
                
                doc.autoTable({
                    startY: yPos,
                    head: [debtsTableData[0]],
                    body: debtsTableData.slice(1),
                    theme: 'grid',
                    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 10 },
                    bodyStyles: { fontSize: 9 },
                    margin: { left: margin, right: margin }
                });
                
                yPos = doc.lastAutoTable.finalY + 20;
            }
            
            // Top Customers
            if (pdfData.customers.length > 0) {
                doc.setFontSize(16);
                doc.setTextColor(0, 75, 147);
                doc.text('TOP CUSTOMERS', margin, yPos);
                
                yPos += 10;
                
                const customersTableData = pdfData.customers.map(customer => [
                    customer.name,
                    this.formatCurrencyForPDF(customer.totalSpent),
                    customer.visits,
                    this.formatCurrencyForPDF(customer.averageSpend),
                    customer.lastVisit,
                    customer.phone
                ]);
                
                customersTableData.unshift(['Customer Name', 'Total Spent', 'Visits', 'Average Spend', 'Last Visit', 'Contact']);
                
                doc.autoTable({
                    startY: yPos,
                    head: [customersTableData[0]],
                    body: customersTableData.slice(1),
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 10 },
                    bodyStyles: { fontSize: 9 },
                    margin: { left: margin, right: margin }
                });
            }
        }
        
        // ===== FINAL PAGE: FOOTER =====
        const totalPages = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Page number
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, doc.internal.pageSize.height - 10, { align: 'right' });
            
            // Footer line
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, doc.internal.pageSize.height - 15, pageWidth - margin, doc.internal.pageSize.height - 15);
            
            // Footer text on last page
            if (i === totalPages) {
                doc.setFontSize(10);
                doc.setTextColor(0, 75, 147);
                doc.text('ARIJEEM INSIGHT 360 - CEO DASHBOARD', pageWidth / 2, doc.internal.pageSize.height - 25, { align: 'center' });
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text('Confidential Document - For Executive Use Only', pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });
                doc.text(`Report Generated: ${reportDate.toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });
                doc.text(`Generated By: ${this.cleanTextForPDF(this.currentCEO?.name)}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }
        }
        
        // SAVE PDF
        const filename = `Arijeem-CEO-Report-${reportDate.toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        console.log('✅ PDF generated successfully with clean text:', filename);
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
        try {
            const userStr = localStorage.getItem('ceo_user');
            const email = localStorage.getItem('ceo_email');
            
            if (userStr && email) {
                this.currentCEO = JSON.parse(userStr);
                this.showDashboard();
                setTimeout(() => this.loadBusinessData(), 1000);
                this.showMessage(`Welcome back, ${this.currentCEO.name}!`, 'success');
            }
        } catch (error) {
            console.error('Auto-login error:', error);
            localStorage.clear();
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CEO Dashboard starting...');
    window.ceoDashboard = new CEODashboard();
    window.ceoDashboard.showCreateAccountScreen();
    console.log('✅ CEO Dashboard started successfully');
    
    // Log in Jesus' name
    console.log('🙏 In Jesus Name, This Dashboard Will Work Perfectly!');
});
