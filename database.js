// CEO DASHBOARD - SYNC WITH MAIN SYSTEM
console.log('🔗 Connecting to Arijeem Insight 360 Database...');

class CEODatabase {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.lastConnectionTest = null;
        this.lastConnectionError = null;
        this.localUsers = [];
        this.syncData = {
            sales: [],
            products: [],
            users: [],
            debts: [],
            customers: [],
            stockHistory: [],
            salesAnalysis: {},
            lastUpdate: null
        };
        this.retryCount = 0;
        this.maxRetries = 3;
        this.init();
    }
    
    async init() {
        try {
            console.log('🔄 Initializing connection to main system...');
            
            // Clear any existing connection issues
            this.lastConnectionError = null;
            
            // Connect to SAME Supabase as main system
            this.supabase = supabase.createClient(
                CEO_CONFIG.SUPABASE_URL,
                CEO_CONFIG.SUPABASE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    },
                    global: {
                        headers: {
                            'apikey': CEO_CONFIG.SUPABASE_KEY,
                            'Authorization': `Bearer ${CEO_CONFIG.SUPABASE_KEY}`
                        }
                    },
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                }
            );
            
            // Test connection with retry logic
            await this.testConnectionWithRetry();
            
            // Load local users if any
            this.loadLocalUsers();
            
            console.log('✅ Database initialization complete');
            
        } catch (error) {
            console.error('❌ Init error:', error);
            this.lastConnectionError = error.message;
            this.isConnected = false;
        }
    }
    
    async testConnectionWithRetry() {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                console.log(`🔌 Testing connection (Attempt ${i + 1}/${this.maxRetries})...`);
                
                // Try to query a simple table to test connection
                const { data, error, count } = await this.supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .limit(1);
                
                if (error) {
                    console.warn(`⚠️ Connection attempt ${i + 1} failed:`, error.message);
                    this.lastConnectionError = error.message;
                    
                    // Wait before retry (exponential backoff)
                    if (i < this.maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
                        continue;
                    }
                } else {
                    this.isConnected = true;
                    this.lastConnectionTest = new Date().toISOString();
                    this.lastConnectionError = null;
                    this.retryCount = 0;
                    console.log('✅ Connected to main system database');
                    return true;
                }
            } catch (error) {
                console.error(`Connection test ${i + 1} failed:`, error);
                this.lastConnectionError = error.message;
                
                if (i < this.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
                }
            }
        }
        
        this.isConnected = false;
        console.error('❌ All connection attempts failed');
        return false;
    }
    
    async ensureConnection() {
        if (!this.isConnected || !this.supabase) {
            console.log('🔄 Re-establishing connection...');
            return await this.testConnectionWithRetry();
        }
        return true;
    }
    
    loadLocalUsers() {
        try {
            const stored = localStorage.getItem('ceo_users');
            this.localUsers = stored ? JSON.parse(stored) : [];
            console.log(`📁 Loaded ${this.localUsers.length} local users`);
        } catch (error) {
            console.error('Error loading local users:', error);
            this.localUsers = [];
        }
    }
    
    // CREATE CEO ACCOUNT
    async createCEOAccount(ceoData) {
        try {
            console.log('👑 Creating CEO account...');
            
            // First check if email exists locally
            const localExists = this.localUsers.find(u => u.email === ceoData.email);
            if (localExists) {
                return {
                    success: false,
                    message: 'Account already exists. Please login.',
                    code: 'EXISTS'
                };
            }
            
            // Ensure connection
            if (!await this.ensureConnection()) {
                return {
                    success: false,
                    message: 'Cannot connect to database. Please check your internet connection.'
                };
            }
            
            // Create user object
            const newUser = {
                id: 'temp_' + Date.now(),
                email: ceoData.email,
                name: ceoData.name,
                phone: ceoData.phone || '',
                role: 'CEO',
                password_hash: btoa(ceoData.password),
                created_at: new Date().toISOString(),
                is_active: true,
                is_local: true,
                needs_sync: true
            };
            
            // Save locally first
            this.localUsers.push(newUser);
            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            localStorage.setItem('ceo_last_user', ceoData.email);
            
            console.log('✅ Account saved locally:', newUser.email);
            
            // Try to sync with main database IMMEDIATELY
            console.log('🔄 Attempting to sync to main database...');
            await this.syncUserToMainDB(newUser);
            
            return {
                success: true,
                user: newUser,
                message: 'Account created successfully!'
            };
            
        } catch (error) {
            console.error('Account creation error:', error);
            return {
                success: false,
                message: 'Failed to create account. Please try again.'
            };
        }
    }
    
    // SYNC ALL DATA FROM MAIN SYSTEM WITH REAL-TIME UPDATES
    async syncFromMainSystem() {
        try {
            console.log('🔄 Syncing data from main system...');
            
            // Ensure connection
            const connected = await this.ensureConnection();
            if (!connected) {
                console.log('⚠️ Cannot sync: No database connection');
                return false;
            }
            
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const now = new Date().toISOString();
            
            console.log(`📅 Fetching data for today: ${today}`);
            
            // Fetch all data in parallel with timeout
            const fetchPromises = [
                this.fetchTodaySales(today),
                this.fetchAllProducts(),
                this.fetchActiveStaff(),
                this.fetchOutstandingDebts(),
                this.fetchRecentCustomers(),
                this.fetchRecentStockMovements()
            ];
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Sync timeout after 30 seconds')), 30000)
            );
            
            // Race between fetch and timeout
            const results = await Promise.race([
                Promise.all(fetchPromises),
                timeoutPromise
            ]);
            
            const [sales, products, users, debts, customers, stockHistory] = results;
            
            // Perform sales analysis
            const salesAnalysis = this.analyzeSales(sales || []);
            
            // Update sync data with timestamp
            this.syncData = {
                sales: sales || [],
                products: products || [],
                users: users || [],
                debts: debts || [],
                customers: customers || [],
                stockHistory: stockHistory || [],
                salesAnalysis: salesAnalysis,
                lastUpdate: now,
                syncTimestamp: now,
                dataCounts: {
                    sales: (sales || []).length,
                    products: (products || []).length,
                    users: (users || []).length,
                    debts: (debts || []).length,
                    customers: (customers || []).length
                }
            };
            
            console.log(`✅ Sync complete at ${now}`);
            console.log(`📊 Data counts: ${sales.length} sales, ${products.length} products, ${debts.length} debts`);
            
            // Store in localStorage for offline access
            this.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.lastConnectionError = error.message;
            this.isConnected = false;
            
            // Try to load from localStorage
            this.loadFromLocalStorage();
            
            return false;
        }
    }
    
    async fetchTodaySales(today) {
        try {
            console.log(`📈 Fetching sales for ${today}...`);
            
            const { data, error } = await this.supabase
                .from('sales')
                .select(`
                    id,
                    product_id,
                    product_name,
                    customer_name,
                    customer_phone,
                    quantity,
                    total_price,
                    unit_price,
                    payment_method,
                    payment_status,
                    sale_date,
                    created_at,
                    products:product_id (
                        name,
                        category,
                        retail_price,
                        wholesale_price
                    )
                `)
                .gte('sale_date', today + 'T00:00:00')
                .lte('sale_date', today + 'T23:59:59.999')
                .order('sale_date', { ascending: false });
            
            if (error) {
                console.error('❌ Fetch sales error:', error);
                return [];
            }
            
            // Enrich sales data with reasons and calculations
            const enrichedSales = (data || []).map(sale => {
                const saleTime = new Date(sale.sale_date || sale.created_at);
                const hour = saleTime.getHours();
                const wholesalePrice = sale.products?.wholesale_price || sale.unit_price * 0.7; // Estimate if not available
                const profitPerItem = sale.unit_price - wholesalePrice;
                const totalProfit = profitPerItem * sale.quantity;
                
                return {
                    ...sale,
                    time: saleTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    date: saleTime.toLocaleDateString(),
                    profit_per_item: profitPerItem,
                    total_profit: totalProfit,
                    margin_percent: sale.unit_price > 0 ? (profitPerItem / sale.unit_price * 100).toFixed(1) : 0,
                    reason: this.determineSaleReason(sale, hour)
                };
            });
            
            console.log(`✅ Fetched ${enrichedSales.length} sales`);
            return enrichedSales;
            
        } catch (error) {
            console.error('❌ Fetch sales error:', error);
            return [];
        }
    }
    
    async fetchAllProducts() {
        try {
            console.log('📦 Fetching all products...');
            
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    id,
                    name,
                    category,
                    current_qty,
                    min_qty,
                    retail_price,
                    wholesale_price,
                    barcode,
                    created_at,
                    updated_at
                `)
                .order('current_qty', { ascending: true }); // Show low stock first
            
            if (error) {
                console.error('❌ Fetch products error:', error);
                return [];
            }
            
            console.log(`✅ Fetched ${data?.length || 0} products`);
            return data || [];
            
        } catch (error) {
            console.error('❌ Fetch products error:', error);
            return [];
        }
    }
    
    async fetchActiveStaff() {
        try {
            console.log('👥 Fetching active staff...');
            
            const { data, error } = await this.supabase
                .from('users')
                .select(`
                    id,
                    name,
                    email,
                    role,
                    last_login,
                    is_active,
                    created_at
                `)
                .eq('is_active', true)
                .neq('role', 'CEO')
                .order('name');
            
            if (error) {
                console.error('❌ Fetch staff error:', error);
                return [];
            }
            
            console.log(`✅ Fetched ${data?.length || 0} staff members`);
            return data || [];
            
        } catch (error) {
            console.error('❌ Fetch staff error:', error);
            return [];
        }
    }
    
    async fetchOutstandingDebts() {
        try {
            console.log('💳 Fetching outstanding debts...');
            
            const { data, error } = await this.supabase
                .from('sales')
                .select(`
                    id,
                    customer_name,
                    customer_phone,
                    total_price,
                    amount_paid,
                    amount_owing,
                    sale_date,
                    created_at,
                    payment_status,
                    products:product_id (
                        name
                    )
                `)
                .or('payment_status.eq.owing,payment_status.eq.partial')
                .gt('amount_owing', 0)
                .order('sale_date', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error('❌ Fetch debts error:', error);
                return [];
            }
            
            // Enrich debt data
            const enrichedDebts = (data || []).map(debt => {
                const saleDate = new Date(debt.sale_date || debt.created_at);
                const daysOwing = Math.floor((new Date() - saleDate) / (1000 * 60 * 60 * 24));
                const interestRate = 0.01; // 1% per month
                const interestAccrued = daysOwing > 30 ? 
                    (debt.amount_owing || 0) * interestRate * Math.floor(daysOwing / 30) : 0;
                
                return {
                    ...debt,
                    days_owing: daysOwing,
                    interest_accrued: interestAccrued,
                    total_due: (debt.amount_owing || 0) + interestAccrued,
                    overdue_status: daysOwing > 90 ? 'Severe' : daysOwing > 30 ? 'High' : 'Normal'
                };
            });
            
            console.log(`✅ Fetched ${enrichedDebts.length} debts`);
            return enrichedDebts;
            
        } catch (error) {
            console.error('❌ Fetch debts error:', error);
            return [];
        }
    }
    
    async fetchRecentCustomers() {
        try {
            console.log('👤 Fetching recent customers...');
            
            // Get unique customers from recent sales
            const { data: recentSales, error } = await this.supabase
                .from('sales')
                .select(`
                    customer_name,
                    customer_phone,
                    total_price,
                    sale_date
                `)
                .order('sale_date', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error('❌ Fetch customers error:', error);
                return [];
            }
            
            // Group by customer
            const customerMap = new Map();
            
            (recentSales || []).forEach(sale => {
                const customerName = sale.customer_name || 'Walk-in Customer';
                if (!customerMap.has(customerName)) {
                    customerMap.set(customerName, {
                        name: customerName,
                        phone: sale.customer_phone || 'N/A',
                        total_spent: 0,
                        purchase_count: 0,
                        last_purchase: sale.sale_date,
                        purchases: []
                    });
                }
                
                const customer = customerMap.get(customerName);
                customer.total_spent += sale.total_price || 0;
                customer.purchase_count++;
                customer.purchases.push({
                    amount: sale.total_price,
                    date: sale.sale_date
                });
                
                // Update last purchase if this is more recent
                if (new Date(sale.sale_date) > new Date(customer.last_purchase)) {
                    customer.last_purchase = sale.sale_date;
                }
            });
            
            // Convert to array and calculate metrics
            const customers = Array.from(customerMap.values())
                .map(c => {
                    const daysSinceLastPurchase = c.last_purchase ? 
                        Math.floor((new Date() - new Date(c.last_purchase)) / (1000 * 60 * 60 * 24)) : 999;
                    
                    return {
                        ...c,
                        avg_purchase: c.purchase_count > 0 ? c.total_spent / c.purchase_count : 0,
                        days_since_last_purchase: daysSinceLastPurchase,
                        customer_type: c.purchase_count > 5 ? 'Regular' : 'Occasional'
                    };
                })
                .sort((a, b) => b.total_spent - a.total_spent)
                .slice(0, 10);
            
            console.log(`✅ Fetched ${customers.length} top customers`);
            return customers;
            
        } catch (error) {
            console.error('❌ Fetch customers error:', error);
            return [];
        }
    }
    
    async fetchRecentStockMovements() {
        try {
            console.log('📊 Fetching recent stock movements...');
            
            const { data, error } = await this.supabase
                .from('stock_movements')
                .select(`
                    id,
                    product_id,
                    quantity_change,
                    previous_qty,
                    new_qty,
                    movement_type,
                    reason,
                    created_at,
                    products:product_id (
                        name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error('❌ Fetch stock history error:', error);
                return [];
            }
            
            console.log(`✅ Fetched ${data?.length || 0} stock movements`);
            return data || [];
            
        } catch (error) {
            console.error('❌ Fetch stock history error:', error);
            return [];
        }
    }
    
    determineSaleReason(sale, hour) {
        const quantity = sale.quantity || 0;
        const amount = sale.total_price || 0;
        const paymentMethod = sale.payment_method || 'cash';
        const customerName = sale.customer_name || '';
        
        if (hour >= 17 && hour <= 20) return "Evening Rush";
        if (hour >= 7 && hour <= 10) return "Morning Rush";
        if (quantity > 10) return "Bulk Purchase";
        if (amount > 50000) return "High-Value Sale";
        if (paymentMethod === 'credit' || paymentMethod === 'debt') return "Credit Sale";
        if (customerName && customerName !== 'Walk-in' && customerName !== '') return "Regular Customer";
        if (sale.payment_status === 'partial') return "Partial Payment";
        
        return "Walk-in Sale";
    }
    
    analyzeSales(sales) {
        if (!sales || sales.length === 0) {
            return {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                peakHour: { hour: 'N/A', amount: 0 },
                topReason: { reason: 'N/A', count: 0 },
                paymentMethods: {},
                profitMargin: 0
            };
        }
        
        const hourlyData = {};
        const paymentMethods = {};
        const reasons = {};
        let totalSales = 0;
        let totalProfit = 0;
        
        sales.forEach(sale => {
            const hour = new Date(sale.sale_date).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + (sale.total_price || 0);
            
            const method = sale.payment_method || 'cash';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
            
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
        
        // Find top payment method
        let topPaymentMethod = { method: 'cash', count: 0 };
        Object.entries(paymentMethods).forEach(([method, count]) => {
            if (count > topPaymentMethod.count) {
                topPaymentMethod = { method, count };
            }
        });
        
        return {
            totalSales,
            totalProfit,
            averageSale: sales.length > 0 ? totalSales / sales.length : 0,
            transactionCount: sales.length,
            peakHour: {
                hour: peakHour.hour,
                amount: peakHour.amount,
                formattedHour: `${peakHour.hour}:00`
            },
            topReason,
            topPaymentMethod,
            paymentMethods,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales * 100).toFixed(1) : 0,
            hourlyData
        };
    }
    
    analyzeStock(products) {
        const good = [], warning = [], critical = [];
        let totalStockValue = 0;
        
        (products || []).forEach(p => {
            const qty = p.current_qty || 0;
            const price = p.retail_price || 0;
            const value = qty * price;
            totalStockValue += value;
            
            const stockItem = {
                ...p,
                stock_value: value,
                needs_restock: qty <= (p.min_qty || CEO_CONFIG.STOCK_WARNING),
                stock_status: qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' : 
                             qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good'
            };
            
            if (stockItem.stock_status === 'critical') {
                critical.push(stockItem);
            } else if (stockItem.stock_status === 'warning') {
                warning.push(stockItem);
            } else {
                good.push(stockItem);
            }
        });
        
        const status = critical.length > 0 ? 'critical' : 
                      warning.length > 0 ? 'warning' : 'good';
        
        return { 
            good, 
            warning, 
            critical, 
            status, 
            totalStockValue,
            totalItems: products?.length || 0,
            criticalCount: critical.length,
            warningCount: warning.length,
            goodCount: good.length
        };
    }
    
    getTopProducts(products) {
        if (!products || products.length === 0) return [];
        
        // Get products with sales data or use current stock as indicator
        return products
            .map(p => {
                const stockValue = (p.current_qty || 0) * (p.retail_price || 0);
                const daysSinceUpdate = p.updated_at ? 
                    Math.floor((new Date() - new Date(p.updated_at)) / (1000 * 60 * 60 * 24)) : 999;
                
                return {
                    ...p,
                    stock_value: stockValue,
                    performance_score: (p.current_qty || 0) > 0 ? 
                        ((p.retail_price || 0) / (p.current_qty || 1)) * 100 : 0,
                    last_updated_days: daysSinceUpdate,
                    turnover_rate: (p.current_qty || 0) > 0 ? 
                        Math.min(100, (100 / (p.current_qty || 1))) : 0
                };
            })
            .sort((a, b) => b.performance_score - a.performance_score)
            .slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT);
    }
    
    // GET BUSINESS DATA WITH REAL-TIME UPDATES
    async getBusinessData() {
        try {
            console.log('📊 Getting fresh business data...');
            
            // Always try to sync first for fresh data
            const syncSuccess = await this.syncFromMainSystem();
            
            if (!syncSuccess && !this.syncData.lastUpdate) {
                console.log('⚠️ Using fallback data');
                return this.getFallbackData();
            }
            
            const { sales, products, users, debts, customers, stockHistory, salesAnalysis } = this.syncData;
            
            // Calculate real-time totals
            const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
            const productsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
            const totalDebt = debts.reduce((sum, d) => sum + (d.total_due || d.amount_owing || 0), 0);
            const totalProfit = sales.reduce((sum, s) => sum + (s.total_profit || 0), 0);
            
            // Get top performing products
            const topProducts = this.getTopProducts(products);
            
            // Stock analysis
            const stock = this.analyzeStock(products);
            
            // Update connection status
            const connectionStatus = {
                connected: this.isConnected,
                lastTest: this.lastConnectionTest,
                lastError: this.lastConnectionError,
                lastUpdate: this.syncData.lastUpdate,
                dataAge: this.syncData.lastUpdate ? 
                    Math.floor((new Date() - new Date(this.syncData.lastUpdate)) / 1000) : null
            };
            
            return {
                sales,
                products,
                users,
                debts,
                customers,
                stockHistory,
                salesAnalysis: salesAnalysis || this.analyzeSales(sales),
                summary: {
                    totalSales,
                    productsSold,
                    staffCount: users.length,
                    totalDebt,
                    totalProfit,
                    profitMargin: totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0,
                    stockStatus: stock.status,
                    lastSync: this.syncData.lastUpdate || new Date().toISOString(),
                    activeCustomers: customers.length,
                    transactionCount: sales.length,
                    syncTimestamp: this.syncData.syncTimestamp
                },
                stock,
                topProducts,
                connection: connectionStatus,
                isConnected: this.isConnected,
                lastConnectionError: this.lastConnectionError,
                dataFreshness: this.syncData.lastUpdate ? 'fresh' : 'cached'
            };
            
        } catch (error) {
            console.error('❌ Get business data error:', error);
            return this.getFallbackData();
        }
    }
    
    getFallbackData() {
        console.log('📊 Using fallback/cached data');
        
        // Try to load from localStorage first
        const cachedData = this.loadFromLocalStorage();
        if (cachedData) {
            console.log('✅ Loaded cached data from localStorage');
            return {
                ...cachedData,
                connection: {
                    connected: false,
                    lastTest: this.lastConnectionTest,
                    lastError: this.lastConnectionError,
                    lastUpdate: cachedData.summary?.lastSync,
                    dataAge: cachedData.summary?.lastSync ? 
                        Math.floor((new Date() - new Date(cachedData.summary.lastSync)) / 1000) : null
                },
                isConnected: false,
                lastConnectionError: this.lastConnectionError || 'No database connection',
                dataFreshness: 'cached'
            };
        }
        
        // Return empty data structure
        return {
            sales: [],
            products: [],
            users: [],
            debts: [],
            customers: [],
            stockHistory: [],
            salesAnalysis: {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                peakHour: { hour: 0, amount: 0, formattedHour: 'N/A' },
                topReason: { reason: 'N/A', count: 0 },
                profitMargin: 0
            },
            summary: {
                totalSales: 0,
                productsSold: 0,
                staffCount: 0,
                totalDebt: 0,
                totalProfit: 0,
                profitMargin: 0,
                stockStatus: 'unknown',
                lastSync: null,
                activeCustomers: 0,
                transactionCount: 0,
                syncTimestamp: null
            },
            stock: { 
                good: [], 
                warning: [], 
                critical: [], 
                status: 'unknown', 
                totalStockValue: 0,
                totalItems: 0,
                criticalCount: 0,
                warningCount: 0,
                goodCount: 0
            },
            topProducts: [],
            connection: {
                connected: false,
                lastTest: this.lastConnectionTest,
                lastError: this.lastConnectionError,
                lastUpdate: null,
                dataAge: null
            },
            isConnected: false,
            lastConnectionError: this.lastConnectionError || 'No database connection',
            dataFreshness: 'none'
        };
    }
    
    saveToLocalStorage() {
        try {
            const dataToSave = {
                syncData: this.syncData,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem('ceo_cached_data', JSON.stringify(dataToSave));
            console.log('💾 Data saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('ceo_cached_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log('📂 Loaded cached data from localStorage');
                return parsed.syncData;
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
        }
        return null;
    }
    
    // LOGIN - Check both local and main database
    async loginCEO(email, password) {
        try {
            console.log(`🔐 Login attempt: ${email}`);
            
            const encodedPassword = btoa(password);
            
            // First check local users
            const localUser = this.localUsers.find(u => 
                u.email === email && u.password_hash === encodedPassword
            );
            
            if (localUser) {
                console.log('✅ Local login successful');
                return {
                    success: true,
                    user: {
                        id: localUser.id,
                        name: localUser.name,
                        email: localUser.email,
                        phone: localUser.phone,
                        is_local: localUser.is_local || true,
                        needs_sync: localUser.needs_sync || false
                    }
                };
            }
            
            // If not found locally, check main database
            if (await this.ensureConnection()) {
                console.log('🔍 Checking main database for user...');
                
                // Try to find user in main DB
                const { data: dbUsers, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .eq('is_active', true);
                
                if (!error && dbUsers && dbUsers.length > 0) {
                    const dbUser = dbUsers[0];
                    
                    // Check password
                    if (dbUser.password_hash === encodedPassword) {
                        console.log('✅ Main DB login successful');
                        
                        // Save user locally for future logins
                        const localUser = {
                            id: dbUser.id,
                            email: dbUser.email,
                            name: dbUser.name,
                            phone: dbUser.phone || '',
                            role: dbUser.role,
                            password_hash: dbUser.password_hash,
                            created_at: dbUser.created_at,
                            is_local: false,
                            synced_at: new Date().toISOString()
                        };
                        
                        // Add to local storage if not already there
                        if (!this.localUsers.find(u => u.email === email)) {
                            this.localUsers.push(localUser);
                            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
                        }
                        
                        return {
                            success: true,
                            user: {
                                id: dbUser.id,
                                name: dbUser.name,
                                email: dbUser.email,
                                phone: dbUser.phone,
                                is_local: false
                            }
                        };
                    } else {
                        console.log('❌ Password mismatch for main DB user');
                    }
                } else {
                    console.log('❌ User not found in main DB:', error?.message || 'No error');
                }
            } else {
                console.log('⚠️ Cannot check main DB: No connection');
            }
            
            return {
                success: false,
                message: 'Invalid email or password.'
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            return {
                success: false,
                message: 'Login failed. Please try again.'
            };
        }
    }
    
    // Check connection status
    async checkHealth() {
        const connected = await this.ensureConnection();
        
        return {
            connected,
            lastConnectionTest: this.lastConnectionTest,
            lastConnectionError: this.lastConnectionError,
            localUsers: this.localUsers.length,
            localUserEmails: this.localUsers.map(u => ({ 
                email: u.email, 
                is_local: u.is_local,
                needs_sync: u.needs_sync 
            })),
            syncData: {
                sales: this.syncData.sales.length,
                products: this.syncData.products.length,
                last_sync: this.syncData.lastUpdate,
                data_age: this.syncData.lastUpdate ? 
                    Math.floor((new Date() - new Date(this.syncData.lastUpdate)) / 1000) : null
            },
            timestamp: new Date().toISOString()
        };
    }
    
    // Force refresh
    async forceRefresh() {
        console.log('🔁 Force refreshing data...');
        this.lastConnectionError = null;
        return await this.syncFromMainSystem();
    }
}

// Initialize database
window.ceoDB = new CEODatabase();

// Debug function
window.debugDatabase = async function() {
    console.log('=== DATABASE DEBUG ===');
    console.log('ceoDB.isConnected:', window.ceoDB?.isConnected);
    console.log('ceoDB.lastConnectionTest:', window.ceoDB?.lastConnectionTest);
    console.log('ceoDB.lastConnectionError:', window.ceoDB?.lastConnectionError);
    console.log('Sync data lastUpdate:', window.ceoDB?.syncData?.lastUpdate);
    console.log('Sync data counts:', window.ceoDB?.syncData?.dataCounts);
    console.log('CEO_CONFIG.SUPABASE_URL:', window.CEO_CONFIG?.SUPABASE_URL);
    
    try {
        console.log('🔌 Testing connection now...');
        const health = await window.ceoDB?.checkHealth();
        console.log('Health check:', health);
    } catch (e) {
        console.log('Health check error:', e.message);
    }
    
    // Check browser storage
    console.log('LocalStorage ceo_users:', localStorage.getItem('ceo_users'));
    console.log('LocalStorage ceo_cached_data:', localStorage.getItem('ceo_cached_data'));
};
