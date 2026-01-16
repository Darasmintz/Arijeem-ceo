// CEO DASHBOARD - DATABASE CONNECTION - COMPLETE FIX
console.log('🔗 Connecting to Arijeem Insight 360 Database...');

class CEODatabase {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.localUsers = [];
        this.init();
    }
    
    async init() {
        try {
            console.log('🔄 Initializing connection to main system...');
            
            // Create Supabase client
            this.supabase = supabase.createClient(
                CEO_CONFIG.SUPABASE_URL,
                CEO_CONFIG.SUPABASE_KEY,
                {
                    auth: { persistSession: false },
                    db: { schema: 'public' }
                }
            );
            
            // Test connection
            await this.testConnection();
            
        } catch (error) {
            console.error('❌ Database init error:', error);
            this.isConnected = false;
        }
    }
    
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .select('count')
                .limit(1);
            
            if (error) throw error;
            
            this.isConnected = true;
            console.log('✅ Successfully connected to main database');
            return true;
            
        } catch (error) {
            console.error('❌ Connection test failed:', error.message);
            this.isConnected = false;
            return false;
        }
    }
    
    // CREATE CEO ACCOUNT - SIMPLIFIED
    async createCEOAccount(ceoData) {
        try {
            const exists = this.localUsers.find(u => u.email === ceoData.email);
            if (exists) {
                return { success: false, message: 'Account exists', code: 'EXISTS' };
            }
            
            const newUser = {
                id: 'ceo_' + Date.now(),
                email: ceoData.email,
                name: ceoData.name,
                phone: ceoData.phone || '',
                role: 'CEO',
                created_at: new Date().toISOString()
            };
            
            this.localUsers.push(newUser);
            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            
            return {
                success: true,
                user: newUser,
                message: 'Account created!'
            };
            
        } catch (error) {
            console.error('Create account error:', error);
            return { success: false, message: 'Failed to create account' };
        }
    }
    
    // LOGIN CEO
    async loginCEO(email, password) {
        try {
            const user = this.localUsers.find(u => u.email === email);
            
            if (user) {
                return {
                    success: true,
                    user: user
                };
            }
            
            return { success: false, message: 'Invalid credentials' };
            
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed' };
        }
    }
    
    // GET COMPLETE BUSINESS DATA - FIXED
    async getBusinessData() {
        try {
            console.log('📊 Fetching business data from main system...');
            
            // Fetch ALL data in parallel
            const [sales, products, debts, customers] = await Promise.all([
                this.fetchTodaySales(),
                this.fetchAllProducts(),
                this.fetchAllDebts(),
                this.fetchTopCustomers()
            ]);
            
            // Calculate summary
            const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
            const productsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
            const totalDebt = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
            
            // Analyze stock
            const stockAnalysis = this.analyzeStock(products);
            
            // Sales analysis
            const salesAnalysis = this.analyzeSales(sales);
            
            // Get top products
            const topProducts = this.getTopProducts(products, sales);
            
            console.log('✅ Data loaded successfully:', {
                sales: sales.length,
                products: products.length,
                debts: debts.length,
                customers: customers.length
            });
            
            return {
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
                    profitMargin: salesAnalysis.profitMargin,
                    lastUpdate: new Date().toISOString(),
                    transactionCount: sales.length,
                    activeCustomers: customers.length
                },
                isConnected: this.isConnected
            };
            
        } catch (error) {
            console.error('❌ Error fetching business data:', error);
            return this.getFallbackData();
        }
    }
    
    // FETCH TODAY'S SALES - FIXED
    async fetchTodaySales() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { data, error } = await this.supabase
                .from('sales')
                .select('*')
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Process sales data
            return (data || []).map(sale => ({
                id: sale.id,
                product_name: sale.product_name || sale.product,
                customer_name: sale.customer_name || 'Customer',
                quantity: sale.quantity || 1,
                total_price: sale.total_price || sale.amount || 0,
                unit_price: sale.unit_price || 0,
                payment_method: sale.payment_method || 'cash',
                sale_date: sale.created_at,
                time: new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            
        } catch (error) {
            console.error('Error fetching sales:', error);
            return [];
        }
    }
    
    // FETCH ALL PRODUCTS - FIXED
    async fetchAllProducts() {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            
            return (data || []).map(product => ({
                id: product.id,
                name: product.name || 'Product',
                current_qty: product.quantity || product.stock || 0,
                min_qty: product.min_stock || CEO_CONFIG.STOCK_WARNING,
                price: product.price || product.selling_price || 0,
                cost_price: product.cost_price || 0,
                category: product.category || 'General'
            }));
            
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }
    
    // FETCH ALL DEBTS - FIXED
    async fetchAllDebts() {
        try {
            const { data, error } = await this.supabase
                .from('debts')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return (data || []).map(debt => ({
                id: debt.id,
                customer_name: debt.customer_name || 'Customer',
                amount: debt.amount || 0,
                created_at: debt.created_at,
                days_owing: this.calculateDaysOwing(debt.created_at),
                phone: debt.customer_phone || 'N/A'
            }));
            
        } catch (error) {
            console.error('Error fetching debts:', error);
            return [];
        }
    }
    
    // FETCH TOP CUSTOMERS - FIXED
    async fetchTopCustomers() {
        try {
            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .order('total_spent', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            return (data || []).map(customer => ({
                id: customer.id,
                name: customer.name || 'Customer',
                total_spent: customer.total_spent || 0,
                purchase_count: customer.purchase_count || 0,
                last_purchase: customer.last_purchase,
                phone: customer.phone || 'N/A'
            }));
            
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    }
    
    // HELPER FUNCTIONS
    calculateDaysOwing(dateString) {
        const debtDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - debtDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    analyzeStock(products) {
        const critical = [];
        const warning = [];
        const good = [];
        
        products.forEach(p => {
            const qty = p.current_qty || 0;
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) {
                critical.push(p);
            } else if (qty <= CEO_CONFIG.STOCK_WARNING) {
                warning.push(p);
            } else {
                good.push(p);
            }
        });
        
        return {
            critical: critical,
            warning: warning,
            good: good,
            status: critical.length > 0 ? 'critical' : warning.length > 0 ? 'warning' : 'good'
        };
    }
    
    analyzeSales(sales) {
        if (!sales.length) {
            return {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                profitMargin: 0
            };
        }
        
        const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        const totalCost = sales.reduce((sum, s) => sum + ((s.quantity || 1) * (s.cost_price || 0)), 0);
        const totalProfit = totalSales - totalCost;
        
        return {
            totalSales: totalSales,
            totalProfit: totalProfit,
            averageSale: totalSales / sales.length,
            transactionCount: sales.length,
            profitMargin: totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0
        };
    }
    
    getTopProducts(products, sales) {
        // Calculate product sales
        const productSales = {};
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
        
        // Merge with product data
        const topProducts = products.map(product => {
            const salesData = productSales[product.name] || { sold_today: 0, revenue: 0 };
            return {
                ...product,
                sold_today: salesData.sold_today,
                revenue: salesData.revenue,
                turnover_rate: product.current_qty > 0 ? 
                    ((salesData.sold_today / product.current_qty) * 100).toFixed(1) : 0
            };
        });
        
        // Sort by revenue
        return topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT);
    }
    
    getFallbackData() {
        console.log('📂 Loading fallback data...');
        return {
            sales: [],
            products: [],
            debts: [],
            customers: [],
            stock: { critical: [], warning: [], good: [], status: 'unknown' },
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
                profitMargin: 0,
                lastUpdate: null,
                transactionCount: 0,
                activeCustomers: 0
            },
            isConnected: false
        };
    }
    
    // FORCE REFRESH
    async forceRefresh() {
        return await this.testConnection();
    }
    
    loadLocalUsers() {
        try {
            const stored = localStorage.getItem('ceo_users');
            this.localUsers = stored ? JSON.parse(stored) : [];
        } catch (error) {
            this.localUsers = [];
        }
    }
}

// Initialize database
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing CEO Database...');
    window.ceoDB = new CEODatabase();
});
