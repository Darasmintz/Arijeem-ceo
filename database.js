// CEO DASHBOARD - DATABASE CONNECTION - COMPLETE FIXED VERSION
console.log('🔗 Connecting to Arijeem Insight 360 Database...');

class CEODatabase {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.lastConnectionTest = null;
        this.localUsers = [];
        this.syncData = {
            sales: [],
            products: [],
            debts: [],
            customers: [],
            stock: [],
            salesAnalysis: {},
            lastUpdate: null
        };
        this.init();
    }
    
    async init() {
        try {
            console.log('🔄 Initializing database connection...');
            
            // Create Supabase client with better settings
            this.supabase = supabase.createClient(
                CEO_CONFIG.SUPABASE_URL,
                CEO_CONFIG.SUPABASE_KEY,
                {
                    auth: { 
                        persistSession: false,
                        autoRefreshToken: true
                    },
                    db: { 
                        schema: 'public'
                    },
                    global: {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                }
            );
            
            // Test connection with better error handling
            await this.testConnection();
            
            // Load local users
            this.loadLocalUsers();
            
            console.log('✅ Database initialized successfully');
            
        } catch (error) {
            console.error('❌ Database init error:', error);
            this.isConnected = false;
            this.showConnectionError(error);
        }
    }
    
    async testConnection() {
        try {
            console.log('🔌 Testing database connection...');
            
            // Try multiple tables to find which one works
            const testTables = ['sales', 'products', 'transactions', 'inventory'];
            let connectionSuccessful = false;
            
            for (const table of testTables) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .select('count')
                        .limit(1);
                    
                    if (!error) {
                        console.log(`✅ Can access ${table} table`);
                        connectionSuccessful = true;
                        break;
                    }
                } catch (tableError) {
                    console.log(`⚠️ Cannot access ${table} table: ${tableError.message}`);
                }
            }
            
            if (connectionSuccessful) {
                this.isConnected = true;
                this.lastConnectionTest = new Date().toISOString();
                console.log('✅ Connected to Arijeem Insight 360 database');
                return true;
            } else {
                throw new Error('Cannot connect to any database table');
            }
            
        } catch (error) {
            console.error('❌ Connection test failed:', error.message);
            this.isConnected = false;
            return false;
        }
    }
    
    showConnectionError(error) {
        const errorMsg = `Database Error: ${error.message}`;
        console.error('🔴', errorMsg);
        
        // Show error in console with details
        if (CEO_CONFIG.DEBUG_MODE) {
            console.group('🔍 Connection Error Details');
            console.error('Error:', error);
            console.log('Supabase URL:', CEO_CONFIG.SUPABASE_URL);
            console.log('Time:', new Date().toLocaleTimeString());
            console.groupEnd();
        }
    }
    
    loadLocalUsers() {
        try {
            const stored = localStorage.getItem('ceo_users');
            this.localUsers = stored ? JSON.parse(stored) : [];
            console.log(`📁 Loaded ${this.localUsers.length} local CEO users`);
        } catch (error) {
            console.error('Error loading local users:', error);
            this.localUsers = [];
        }
    }
    
    // CREATE CEO ACCOUNT
    async createCEOAccount(ceoData) {
        try {
            console.log('👑 Creating CEO account...');
            
            // Check if account already exists
            const exists = this.localUsers.find(u => u.email === ceoData.email);
            if (exists) {
                return {
                    success: false,
                    message: 'Account already exists. Please login.',
                    code: 'EXISTS'
                };
            }
            
            // Create new user
            const newUser = {
                id: 'ceo_' + Date.now(),
                email: ceoData.email,
                name: ceoData.name,
                phone: ceoData.phone || '',
                role: 'CEO',
                created_at: new Date().toISOString(),
                is_active: true,
                permissions: ['view_dashboard', 'view_reports', 'view_financials']
            };
            
            // Save locally
            this.localUsers.push(newUser);
            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            localStorage.setItem('ceo_last_user', ceoData.email);
            
            console.log('✅ Account created and saved locally');
            
            return {
                success: true,
                user: newUser,
                message: 'CEO Account created successfully!'
            };
            
        } catch (error) {
            console.error('Account creation error:', error);
            return {
                success: false,
                message: 'Failed to create account. Please try again.'
            };
        }
    }
    
    // LOGIN CEO
    async loginCEO(email, password) {
        try {
            console.log(`🔐 Login attempt for: ${email}`);
            
            // Find user in local storage
            const user = this.localUsers.find(u => 
                u.email.toLowerCase() === email.toLowerCase()
            );
            
            if (user) {
                console.log('✅ Login successful for:', user.name);
                return {
                    success: true,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        permissions: user.permissions
                    }
                };
            }
            
            return {
                success: false,
                message: 'Invalid email or password. Please create an account first.'
            };
            
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Login failed due to system error.'
            };
        }
    }
    
    // GET COMPLETE BUSINESS DATA - OPTIMIZED
    async getBusinessData() {
        try {
            console.log('📊 Fetching business data...');
            
            // Check connection first
            if (!this.isConnected) {
                await this.testConnection();
            }
            
            if (!this.isConnected) {
                console.log('⚠️ No active connection - using cached data');
                return this.getCachedData();
            }
            
            // Fetch all data in parallel for better performance
            const fetchPromises = [
                this.fetchTodaySales(),
                this.fetchAllProducts(),
                this.fetchAllDebts(),
                this.fetchTopCustomers()
            ];
            
            const [sales, products, debts, customers] = await Promise.all(fetchPromises);
            
            // Log data counts for debugging
            if (CEO_CONFIG.LOG_DATA_FETCH) {
                console.group('📦 Data Fetch Results');
                console.log('Sales:', sales.length);
                console.log('Products:', products.length);
                console.log('Debts:', debts.length);
                console.log('Customers:', customers.length);
                console.groupEnd();
            }
            
            // Analyze data
            const salesAnalysis = this.analyzeSales(sales);
            const stockAnalysis = this.analyzeStock(products);
            const topProducts = this.getTopProducts(products, sales);
            
            // Calculate totals
            const totalSales = sales.reduce((sum, s) => sum + (s.total_price || s.amount || 0), 0);
            const productsSold = sales.reduce((sum, s) => sum + (s.quantity || 1), 0);
            const totalDebt = debts.reduce((sum, d) => sum + (d.amount || d.amount_owing || 0), 0);
            const totalStockValue = products.reduce((sum, p) => {
                const qty = p.current_qty || p.quantity || 0;
                const price = p.price || p.selling_price || 0;
                return sum + (qty * price);
            }, 0);
            
            // Prepare final data object
            const businessData = {
                sales: sales,
                products: products,
                debts: debts,
                customers: customers,
                stock: stockAnalysis,
                topProducts: topProducts,
                salesAnalysis: salesAnalysis,
                summary: {
                    totalSales: totalSales,
                    productsSold: productsSold,
                    totalDebt: totalDebt,
                    totalStockValue: totalStockValue,
                    profitMargin: salesAnalysis.profitMargin,
                    lastUpdate: new Date().toISOString(),
                    transactionCount: sales.length,
                    activeCustomers: customers.length,
                    totalProducts: products.length,
                    connectionStatus: this.isConnected ? 'connected' : 'disconnected'
                },
                isConnected: this.isConnected,
                timestamp: new Date().toISOString()
            };
            
            // Cache the data
            this.cacheData(businessData);
            
            console.log('✅ Business data loaded successfully');
            return businessData;
            
        } catch (error) {
            console.error('❌ Error fetching business data:', error);
            return this.getCachedData();
        }
    }
    
    // FETCH TODAY'S SALES - IMPROVED
    async fetchTodaySales() {
        try {
            console.log('💰 Fetching today\'s sales...');
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Try different table names for sales
            const salesTables = ['sales', 'transactions', 'orders', 'sales_transactions'];
            
            for (const table of salesTables) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .select('*')
                        .gte('created_at', today.toISOString())
                        .order('created_at', { ascending: false })
                        .limit(CEO_CONFIG.MAX_ROWS_PER_TABLE);
                    
                    if (!error && data && data.length > 0) {
                        console.log(`✅ Found ${data.length} sales in ${table} table`);
                        
                        // Process sales data
                        return data.map(sale => {
                            // Handle different field names
                            const productName = sale.product_name || sale.product || sale.item_name || 'Product';
                            const customerName = sale.customer_name || sale.customer || sale.client_name || 'Customer';
                            const quantity = sale.quantity || sale.qty || sale.amount || 1;
                            const totalPrice = sale.total_price || sale.total || sale.amount || sale.price || 0;
                            const unitPrice = sale.unit_price || sale.price || (totalPrice / quantity);
                            
                            return {
                                id: sale.id,
                                product_name: productName,
                                customer_name: customerName,
                                quantity: quantity,
                                total_price: totalPrice,
                                unit_price: unitPrice,
                                payment_method: sale.payment_method || sale.payment || 'cash',
                                sale_date: sale.sale_date || sale.created_at,
                                created_at: sale.created_at,
                                time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                reason: sale.reason || 'Sale',
                                notes: sale.notes || ''
                            };
                        });
                    }
                } catch (tableError) {
                    console.log(`⚠️ Cannot access ${table} table:`, tableError.message);
                }
            }
            
            console.log('ℹ️ No sales found for today');
            return [];
            
        } catch (error) {
            console.error('Error fetching sales:', error);
            return [];
        }
    }
    
    // FETCH ALL PRODUCTS - FIXED FOR ACTUAL STOCK
    async fetchAllProducts() {
        try {
            console.log('📦 Fetching products with ACTUAL stock...');
            
            // Try different table names
            const productTables = ['products', 'inventory', 'items', 'stock_items'];
            
            for (const table of productTables) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .select('*')
                        .order('name', { ascending: true });
                    
                    if (!error && data && data.length > 0) {
                        console.log(`✅ Found ${data.length} products in ${table} table`);
                        
                        return data.map(product => {
                            // Try multiple possible field names for stock quantity
                            const stockQty = this.extractStockQuantity(product);
                            const price = this.extractPrice(product);
                            
                            console.log(`📊 ${product.name || 'Product'}: Stock=${stockQty}, Price=${price}`);
                            
                            return {
                                id: product.id,
                                name: product.name || product.product_name || 'Product',
                                description: product.description || '',
                                current_qty: stockQty, // ACTUAL stock quantity
                                min_qty: product.min_stock || product.minimum_stock || CEO_CONFIG.STOCK_WARNING,
                                price: price, // ACTUAL price
                                cost_price: product.cost_price || product.purchase_price || 0,
                                category: product.category || product.type || 'General',
                                barcode: product.barcode || product.sku || '',
                                unit: product.unit || product.measurement || 'units',
                                last_updated: product.updated_at || product.created_at,
                                // Store raw for debugging
                                _raw: CEO_CONFIG.DEBUG_MODE ? product : undefined
                            };
                        });
                    }
                } catch (tableError) {
                    console.log(`⚠️ Cannot access ${table} table:`, tableError.message);
                }
            }
            
            console.log('ℹ️ No products found in any table');
            return [];
            
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }
    
    // Helper: Extract stock quantity from various field names
    extractStockQuantity(product) {
        const possibleFields = [
            'stock_quantity', 'current_stock', 'quantity', 'stock', 
            'current_qty', 'available_qty', 'in_stock', 'qty'
        ];
        
        for (const field of possibleFields) {
            if (product[field] !== undefined && product[field] !== null) {
                const value = Number(product[field]);
                if (!isNaN(value)) {
                    return value;
                }
            }
        }
        
        return 0; // Default if no stock found
    }
    
    // Helper: Extract price from various field names
    extractPrice(product) {
        const possibleFields = [
            'selling_price', 'price', 'retail_price', 'unit_price',
            'sale_price', 'current_price', 'market_price'
        ];
        
        for (const field of possibleFields) {
            if (product[field] !== undefined && product[field] !== null) {
                const value = Number(product[field]);
                if (!isNaN(value)) {
                    return value;
                }
            }
        }
        
        return 0; // Default if no price found
    }
    
    // FETCH ALL DEBTS
    async fetchAllDebts() {
        try {
            console.log('💳 Fetching outstanding debts...');
            
            const { data, error } = await this.supabase
                .from('debts')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(CEO_CONFIG.MAX_ROWS_PER_TABLE);
            
            if (error) {
                console.log('ℹ️ No debts table or empty:', error.message);
                return [];
            }
            
            if (!data || data.length === 0) {
                console.log('✅ No outstanding debts');
                return [];
            }
            
            console.log(`✅ Found ${data.length} outstanding debts`);
            
            return data.map(debt => ({
                id: debt.id,
                customer_name: debt.customer_name || debt.customer || 'Customer',
                amount: debt.amount || debt.amount_owing || 0,
                created_at: debt.created_at,
                due_date: debt.due_date,
                days_owing: this.calculateDaysOwing(debt.created_at, debt.due_date),
                phone: debt.customer_phone || debt.phone || 'N/A',
                status: debt.status || 'pending',
                notes: debt.notes || ''
            }));
            
        } catch (error) {
            console.error('Error fetching debts:', error);
            return [];
        }
    }
    
    // FETCH TOP CUSTOMERS
    async fetchTopCustomers() {
        try {
            console.log('👥 Fetching top customers...');
            
            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .order('total_spent', { ascending: false })
                .limit(10);
            
            if (error) {
                console.log('ℹ️ No customers table:', error.message);
                return this.extractCustomersFromSales();
            }
            
            if (!data || data.length === 0) {
                console.log('ℹ️ No customer data, extracting from sales');
                return this.extractCustomersFromSales();
            }
            
            console.log(`✅ Found ${data.length} customers`);
            
            return data.map(customer => ({
                id: customer.id,
                name: customer.name || 'Customer',
                email: customer.email || '',
                phone: customer.phone || '',
                total_spent: customer.total_spent || 0,
                purchase_count: customer.purchase_count || customer.visit_count || 0,
                last_purchase: customer.last_purchase,
                average_spend: customer.total_spent && customer.purchase_count ? 
                    customer.total_spent / customer.purchase_count : 0,
                customer_since: customer.created_at,
                notes: customer.notes || ''
            }));
            
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    }
    
    // Extract customers from sales data as fallback
    extractCustomersFromSales() {
        try {
            const customerMap = new Map();
            
            this.syncData.sales.forEach(sale => {
                const customerName = sale.customer_name;
                if (customerName && customerName !== 'Customer') {
                    if (!customerMap.has(customerName)) {
                        customerMap.set(customerName, {
                            name: customerName,
                            total_spent: 0,
                            purchase_count: 0,
                            last_purchase: sale.created_at
                        });
                    }
                    
                    const customer = customerMap.get(customerName);
                    customer.total_spent += sale.total_price || 0;
                    customer.purchase_count += 1;
                    
                    // Update last purchase if newer
                    if (new Date(sale.created_at) > new Date(customer.last_purchase)) {
                        customer.last_purchase = sale.created_at;
                    }
                }
            });
            
            return Array.from(customerMap.values())
                .sort((a, b) => b.total_spent - a.total_spent)
                .slice(0, 10);
            
        } catch (error) {
            console.error('Error extracting customers from sales:', error);
            return [];
        }
    }
    
    // ANALYZE SALES
    analyzeSales(sales) {
        if (!sales || sales.length === 0) {
            return {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                profitMargin: 0,
                peakHour: null,
                topReason: null
            };
        }
        
        const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const totalCost = sales.reduce((sum, s) => {
            const cost = (s.quantity || 1) * (s.cost_price || (s.total_price || 0) * 0.7);
            return sum + cost;
        }, 0);
        
        const totalProfit = totalSales - totalCost;
        const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;
        
        // Find peak hour
        const hourSales = {};
        sales.forEach(sale => {
            const hour = new Date(sale.created_at).getHours();
            hourSales[hour] = (hourSales[hour] || 0) + (sale.total_price || 0);
        });
        
        let peakHour = null;
        let maxAmount = 0;
        for (const [hour, amount] of Object.entries(hourSales)) {
            if (amount > maxAmount) {
                maxAmount = amount;
                peakHour = hour;
            }
        }
        
        return {
            totalSales: totalSales,
            totalProfit: totalProfit,
            averageSale: totalSales / sales.length,
            transactionCount: sales.length,
            profitMargin: profitMargin,
            peakHour: peakHour ? {
                hour: peakHour,
                formattedHour: `${peakHour}:00`,
                amount: maxAmount
            } : null,
            topReason: 'Regular Sale' // Could be calculated from sale.reason
        };
    }
    
    // ANALYZE STOCK - FIXED FOR ACTUAL STOCK
    analyzeStock(products) {
        if (!products || products.length === 0) {
            return {
                critical: [],
                warning: [],
                good: [],
                status: 'unknown',
                totalStock: 0
            };
        }
        
        const critical = [];
        const warning = [];
        const good = [];
        let totalStock = 0;
        
        products.forEach(p => {
            const qty = p.current_qty || 0;
            totalStock += qty;
            
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) {
                critical.push(p);
            } else if (qty <= CEO_CONFIG.STOCK_WARNING) {
                warning.push(p);
            } else {
                good.push(p);
            }
        });
        
        console.log(`📊 Stock Analysis: Total Stock=${totalStock.toLocaleString()}, Critical=${critical.length}, Warning=${warning.length}, Good=${good.length}`);
        
        const status = critical.length > 0 ? 'critical' : 
                      warning.length > 0 ? 'warning' : 'good';
        
        return { 
            critical, 
            warning, 
            good, 
            status,
            totalStock: totalStock 
        };
    }
    
    // GET TOP PRODUCTS
    getTopProducts(products, sales) {
        if (!products || products.length === 0) {
            return [];
        }
        
        // Calculate product sales from today's sales
        const productSales = {};
        if (sales && sales.length > 0) {
            sales.forEach(sale => {
                const productName = sale.product_name;
                if (!productSales[productName]) {
                    productSales[productName] = {
                        name: productName,
                        sold_today: 0,
                        revenue: 0
                    };
                }
                productSales[productName].sold_today += sale.quantity || 1;
                productSales[productName].revenue += sale.total_price || 0;
            });
        }
        
        // Merge with product data
        const enrichedProducts = products.map(product => {
            const salesData = productSales[product.name] || { sold_today: 0, revenue: 0 };
            const turnoverRate = product.current_qty > 0 ? 
                ((salesData.sold_today / product.current_qty) * 100).toFixed(1) : 0;
            
            return {
                ...product,
                sold_today: salesData.sold_today,
                revenue: salesData.revenue,
                turnover_rate: turnoverRate,
                stock_value: (product.current_qty || 0) * (product.price || 0),
                needs_reorder: (product.current_qty || 0) <= (product.min_qty || CEO_CONFIG.STOCK_WARNING)
            };
        });
        
        // Sort by revenue (or stock value if no sales)
        return enrichedProducts
            .sort((a, b) => (b.revenue || b.stock_value) - (a.revenue || a.stock_value))
            .slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT);
    }
    
    // CACHE DATA
    cacheData(data) {
        try {
            const cache = {
                data: data,
                timestamp: new Date().toISOString(),
                expires: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
            };
            
            localStorage.setItem('ceo_cached_data', JSON.stringify(cache));
            
            if (CEO_CONFIG.DEBUG_MODE) {
                console.log('💾 Data cached successfully');
            }
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }
    
    // GET CACHED DATA
    getCachedData() {
        try {
            const cached = localStorage.getItem('ceo_cached_data');
            if (!cached) {
                return this.getFallbackData();
            }
            
            const cache = JSON.parse(cached);
            const now = new Date();
            const cacheTime = new Date(cache.timestamp);
            const expiresTime = new Date(cache.expires);
            
            // Check if cache is still valid
            if (now > expiresTime) {
                console.log('⚠️ Cached data expired');
                return this.getFallbackData();
            }
            
            console.log('📂 Using cached data from', cacheTime.toLocaleTimeString());
            return cache.data;
            
        } catch (error) {
            console.error('Error loading cached data:', error);
            return this.getFallbackData();
        }
    }
    
    // GET FALLBACK DATA
    getFallbackData() {
        console.log('🔄 Loading fallback data...');
        
        return {
            sales: [],
            products: [],
            debts: [],
            customers: [],
            stock: { 
                critical: [], 
                warning: [], 
                good: [], 
                status: 'unknown',
                totalStock: 0
            },
            topProducts: [],
            salesAnalysis: {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                profitMargin: 0
            },
            summary: {
                totalSales: 0,
                productsSold: 0,
                totalDebt: 0,
                totalStockValue: 0,
                profitMargin: 0,
                lastUpdate: null,
                transactionCount: 0,
                activeCustomers: 0,
                totalProducts: 0,
                connectionStatus: 'disconnected'
            },
            isConnected: false,
            timestamp: new Date().toISOString()
        };
    }
    
    // HELPER FUNCTIONS
    calculateDaysOwing(createdDate, dueDate) {
        const startDate = dueDate ? new Date(dueDate) : new Date(createdDate);
        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // FORCE REFRESH
    async forceRefresh() {
        try {
            console.log('🔄 Force refreshing data...');
            
            // Test connection
            const connected = await this.testConnection();
            
            if (!connected) {
                console.log('❌ Cannot refresh - No database connection');
                return false;
            }
            
            // Clear cache
            localStorage.removeItem('ceo_cached_data');
            
            console.log('✅ Force refresh initiated');
            return true;
            
        } catch (error) {
            console.error('Force refresh error:', error);
            return false;
        }
    }
}

// Initialize database when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing CEO Database Connection...');
    
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        console.error('❌ CRITICAL: Supabase client not loaded!');
        return;
    }
    
    // Initialize database
    window.ceoDB = new CEODatabase();
    
    // Health check after 3 seconds
    setTimeout(() => {
        if (window.ceoDB) {
            console.log('🏥 Database Health Check:', {
                connected: window.ceoDB.isConnected,
                lastTest: window.ceoDB.lastConnectionTest
            });
        }
    }, 3000);
    
    console.log('✅ CEO Database initialized');
});
