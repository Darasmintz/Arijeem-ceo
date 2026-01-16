// CEO DASHBOARD CONFIGURATION - ARIJEEM INSIGHT 360
const CEO_CONFIG = {
    // SUPABASE CONNECTION - Your main app database
    SUPABASE_URL: 'https://twnbpdqssvzuvdlfzdum.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bmJwZHFzc3Z6dXZkbGZ6ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzQ0NzAsImV4cCI6MjA4Mzg1MDQ3MH0.XfPvPh4YZDES5gktKkj5KHtHmNTZmjye8LfDkBbpX-U',
    
    // SYSTEM SETTINGS
    COMPANY: 'Arijeem Enterprises',
    REPORT_TIME: '20:00',
    
    // STOCK ALERTS - UPDATED FOR ACTUAL STOCK LEVELS (15000+)
    STOCK_WARNING: 100,    // Warning when below 100 units
    STOCK_CRITICAL: 50,    // Critical when below 50 units
    
    // PASSWORD REQUIREMENTS
    PASSWORD_MIN: 6,
    
    // SYNC SETTINGS
    SYNC_INTERVAL: 30000,  // 30 seconds for better performance
    AUTO_REPORT_CHECK: 60000,
    
    // UI SETTINGS
    MESSAGE_DISPLAY_TIME: 4000,
    AUTO_LOGOUT_MINUTES: 60,
    
    // REPORT SETTINGS
    TOP_PRODUCTS_LIMIT: 10,
    COMPANY_ADDRESS: 'Lagos, Nigeria',
    COMPANY_PHONE: '+234 800 000 0000',
    
    // DATA SETTINGS
    MAX_ROWS_PER_TABLE: 50,
    MAX_PDF_PRODUCTS: 100,
    
    // DEBUG SETTINGS
    DEBUG_MODE: true,
    LOG_DATA_FETCH: true
};

// Make globally available
window.CEO_CONFIG = CEO_CONFIG;

// Initialization check
console.log('⚙️ CEO Config loaded:', CEO_CONFIG.COMPANY);
