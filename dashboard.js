// CEO DASHBOARD CONTROLLER - COMPLETE WORKING VERSION
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
    
    // LOAD BUSINESS DATA - FIXED
    async loadBusinessData(silent = false) {
        try {
            if (!silent) {
                this.showLoadingIndicator(true);
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
                this.showMessage('Data loaded successfully', 'success');
            }
            
        } catch (error) {
            console.error('❌ Load business data error:', error);
            if (!silent) {
                this.showMessage('Failed to load data', 'error');
            }
        } finally {
            if (!silent) {
                this.showLoadingIndicator(false);
            }
        }
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
                detailEl.textContent = `Live data | ${this.businessData.sales.length} sales today`;
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
    }
    
    // UPDATE DASHBOARD - FIXED
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
        
        if (peakHourEl) peakHourEl.textContent = '2 PM'; // Default or calculate from sales
        if (peakHourAmountEl) peakHourAmountEl.textContent = `₦${(salesAnalysis?.totalSales || 0).toLocaleString()}`;
        if (averageSaleAmountEl) averageSaleAmountEl.textContent = `₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`;
        if (topReasonEl) topReasonEl.textContent = 'Regular Sale';
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
        
        sales.slice(0, 15).forEach(sale => {
            const profit = (sale.total_price || 0) * 0.3; // 30% profit estimate
            
            html += `
                <tr>
                    <td><strong>${sale.time || 'N/A'}</strong></td>
                    <td>${sale.customer_name || 'Customer'}</td>
                    <td>${sale.product_name || 'Product'}</td>
                    <td style="text-align: center;">${sale.quantity || 0}</td>
                    <td>₦${(sale.total_price || 0).toLocaleString()}</td>
                    <td><span class="payment-method">${sale.payment_method || 'cash'}</span></td>
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
        
        products.slice(0, 10).forEach((product, index) => {
            const qty = product.current_qty || 0;
            const price = product.price || 0;
            const status = qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' :
                          qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good';
            
            const reorderNeeded = qty <= CEO_CONFIG.STOCK_WARNING ? 'YES' : 'NO';
            const stockValue = qty * price;
            
            html += `
                <tr>
                    <td><strong>${product.name || 'Product'}</strong></td>
                    <td style="text-align: center;">${qty}</td>
                    <td style="text-align: center;">${product.sold_today || 0}</td>
                    <td>₦${stockValue.toLocaleString()}</td>
                    <td style="text-align: center;">${product.turnover_rate || '0'}%</td>
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
            const price = p.price || 0;
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
        const total = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        debts.slice(0, 15).forEach(debt => {
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
        if (topProductsTotal) topProductsTotal.textContent = `Top ${Math.min(this.businessData.topProducts?.length || 0, 10)} Products`;
        if (customersTotal) customersTotal.textContent = `Top ${Math.min(this.businessData.customers?.length || 0, 10)}`;
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
            
            this.showMessage('Refreshing data...', 'info');
            
            // Test connection
            const connected = await window.ceoDB.testConnection();
            
            if (connected) {
                await this.loadBusinessData();
                this.showMessage('Data refreshed successfully!', 'success');
            } else {
                this.showMessage('Could not connect to main system', 'warning');
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
    
    // PDF REPORT GENERATION - COMPLETE FIX
    async generatePDFReport() {
        if (this.isGeneratingPDF) return;
        
        try {
            this.isGeneratingPDF = true;
            
            if (!this.businessData) {
                this.showMessage('Please load data first', 'info');
                return;
            }
            
            this.showMessage('Generating PDF report...', 'info');
            
            // Load jsPDF if not available
            if (typeof jspdf === 'undefined') {
                await this.loadJSPDF();
            }
            
            // Generate PDF
            await this.createCompletePDFReport();
            
            this.showMessage('✅ PDF report generated successfully!', 'success');
            
        } catch (error) {
            console.error('PDF generation error:', error);
            this.showMessage('Failed to generate PDF', 'error');
        } finally {
            this.isGeneratingPDF = false;
        }
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
    
    async createCompletePDFReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        let yPos = 20;
        
        // HEADER
        doc.setFontSize(24);
        doc.setTextColor(0, 75, 147);
        doc.text('ARIJEEM ENTERPRISES', pageWidth / 2, yPos, { align: 'center' });
        
        doc.setFontSize(18);
        doc.text('CEO BUSINESS REPORT', pageWidth / 2, yPos + 10, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Report Date: ${new Date().toLocaleString()}`, pageWidth / 2, yPos + 18, { align: 'center' });
        
        yPos = 45;
        
        // EXECUTIVE SUMMARY
        doc.setFontSize(16);
        doc.setTextColor(0, 75, 147);
        doc.text('EXECUTIVE SUMMARY', 20, yPos);
        
        yPos += 10;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        const { summary, salesAnalysis, products, sales, debts, customers } = this.businessData;
        
        const totalStockValue = products.reduce((sum, p) => {
            const price = p.price || 0;
            return sum + ((p.current_qty || 0) * price);
        }, 0);
        
        const summaryData = [
            `Total Sales Today: ₦${(summary.totalSales || 0).toLocaleString()}`,
            `Products Sold: ${summary.productsSold || 0} units`,
            `Total Profit: ₦${Math.round(salesAnalysis?.totalProfit || 0).toLocaleString()}`,
            `Profit Margin: ${salesAnalysis?.profitMargin || '0'}%`,
            `Transaction Count: ${summary.transactionCount || 0}`,
            `Average Sale: ₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`,
            `Total Stock Value: ₦${totalStockValue.toLocaleString()}`,
            `Products in Inventory: ${products.length}`,
            `Outstanding Debts: ₦${summary.totalDebt || 0}`,
            `Active Customers: ${customers.length}`
        ];
        
        summaryData.forEach((item, index) => {
            doc.text(item, 25, yPos + (index * 7));
        });
        
        yPos += 80;
        
        // SALES DETAILS
        if (sales.length > 0) {
            doc.addPage();
            yPos = 20;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 75, 147);
            doc.text('TODAY\'S SALES DETAILS', 20, yPos);
            
            yPos += 10;
            doc.setFontSize(10);
            
            // Table header
            doc.setFillColor(0, 75, 147);
            doc.setTextColor(255, 255, 255);
            doc.rect(20, yPos, 170, 8, 'F');
            doc.text('Time', 22, yPos + 6);
            doc.text('Customer', 50, yPos + 6);
            doc.text('Product', 90, yPos + 6);
            doc.text('Amount', 150, yPos + 6);
            
            yPos += 10;
            doc.setTextColor(0, 0, 0);
            
            // Sales rows
            sales.slice(0, 30).forEach((sale, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.text(sale.time || 'N/A', 22, yPos);
                doc.text(sale.customer_name || 'Customer', 50, yPos);
                doc.text(sale.product_name || 'Product', 90, yPos);
                doc.text(`₦${(sale.total_price || 0).toLocaleString()}`, 150, yPos);
                
                yPos += 7;
            });
        }
        
        // STOCK REPORT
        if (products.length > 0) {
            doc.addPage();
            yPos = 20;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 75, 147);
            doc.text('STOCK INVENTORY REPORT', 20, yPos);
            
            yPos += 10;
            
            // Stock summary
            doc.setFontSize(11);
            const { stock } = this.businessData;
            doc.text(`Critical Items: ${stock.critical?.length || 0}`, 20, yPos);
            doc.text(`Warning Items: ${stock.warning?.length || 0}`, 80, yPos);
            doc.text(`Good Items: ${stock.good?.length || 0}`, 140, yPos);
            
            yPos += 15;
            
            // Table header
            doc.setFillColor(0, 75, 147);
            doc.setTextColor(255, 255, 255);
            doc.rect(20, yPos, 170, 8, 'F');
            doc.text('Product', 22, yPos + 6);
            doc.text('Stock', 80, yPos + 6);
            doc.text('Min', 100, yPos + 6);
            doc.text('Value', 130, yPos + 6);
            doc.text('Status', 160, yPos + 6);
            
            yPos += 10;
            doc.setTextColor(0, 0, 0);
            
            // Stock rows
            products.slice(0, 30).forEach(product => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                
                const qty = product.current_qty || 0;
                const value = qty * (product.price || 0);
                let status = 'GOOD';
                if (qty <= CEO_CONFIG.STOCK_CRITICAL) status = 'CRITICAL';
                else if (qty <= CEO_CONFIG.STOCK_WARNING) status = 'WARNING';
                
                doc.text(product.name || 'Product', 22, yPos);
                doc.text(qty.toString(), 80, yPos);
                doc.text((product.min_qty || CEO_CONFIG.STOCK_WARNING).toString(), 100, yPos);
                doc.text(`₦${value.toLocaleString()}`, 130, yPos);
                doc.text(status, 160, yPos);
                
                yPos += 7;
            });
        }
        
        // DEBTS REPORT
        if (debts.length > 0) {
            doc.addPage();
            yPos = 20;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 75, 147);
            doc.text('OUTSTANDING DEBTS', 20, yPos);
            
            yPos += 10;
            
            // Table header
            doc.setFillColor(0, 75, 147);
            doc.setTextColor(255, 255, 255);
            doc.rect(20, yPos, 170, 8, 'F');
            doc.text('Customer', 22, yPos + 6);
            doc.text('Amount', 80, yPos + 6);
            doc.text('Days', 120, yPos + 6);
            doc.text('Phone', 140, yPos + 6);
            
            yPos += 10;
            doc.setTextColor(0, 0, 0);
            
            // Debt rows
            debts.slice(0, 30).forEach(debt => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.text(debt.customer_name || 'Customer', 22, yPos);
                doc.text(`₦${(debt.amount || 0).toLocaleString()}`, 80, yPos);
                doc.text((debt.days_owing || 0).toString(), 120, yPos);
                doc.text(debt.phone || 'N/A', 140, yPos);
                
                yPos += 7;
            });
        }
        
        // FOOTER
        const lastPage = doc.internal.getNumberOfPages();
        doc.setPage(lastPage);
        yPos = doc.internal.pageSize.height - 30;
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('--- END OF REPORT ---', pageWidth / 2, yPos, { align: 'center' });
        yPos += 7;
        doc.text('Arijeem Insight 360 - CEO Dashboard', pageWidth / 2, yPos, { align: 'center' });
        yPos += 7;
        doc.text('Confidential - For Executive Use Only', pageWidth / 2, yPos, { align: 'center' });
        
        // SAVE PDF
        const filename = `Arijeem-CEO-Report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
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

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CEO Dashboard starting...');
    window.ceoDashboard = new CEODashboard();
    window.ceoDashboard.showCreateAccountScreen();
    console.log('✅ CEO Dashboard started successfully');
});
