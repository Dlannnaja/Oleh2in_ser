require('dotenv').config();

const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');
const app = express();
const port = process.env.PORT || 3000;

// ✅ Middleware CORS (aman & spesifik)
const corsOptions = {
  origin: [
    'https://oleh2in-pos-v2.web.app',
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// 🔍 Debug middleware
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.url} from ${req.get('Origin')}`);
  next();
});

// ✅ Cek environment variable Midtrans
if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) {
  console.error('❌ ERROR: Midtrans environment variables not set!');
}

// ✅ Midtrans config — pastikan SANDBOX MODE
const snap = new midtransClient.Snap({
  isProduction: false, // <- jangan ubah ke true sebelum pakai live key
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ✅ Cek environment di server
app.get('/check-env', (req, res) => {
  res.json({
    message: "Checking environment variables on Render server",
    node_env: process.env.NODE_ENV,
    isProduction: isProd,
    server_key_exists: !!process.env.MIDTRANS_SERVER_KEY,
    server_key_preview: process.env.MIDTRANS_SERVER_KEY?.substring(0, 15) + '...',
    client_key_exists: !!process.env.MIDTRANS_CLIENT_KEY,
    client_key_preview: process.env.MIDTRANS_CLIENT_KEY?.substring(0, 15) + '...',
    isProduction: snap.apiConfig?.isProduction,
  });
});

// ✅ Tes koneksi Midtrans
app.get('/test-midtrans', async (req, res) => {
  console.log('🧪 Testing Midtrans connection...');

  try {
    const testData = {
      transaction_details: {
        order_id: 'TEST-' + Date.now(),
        gross_amount: 1000
      },
      customer_details: {
        first_name: "Tester",
        email: "tester@example.com",
        phone: "08123456789"
      },
      item_details: [{
        id: 'TEST-ITEM',
        price: 1000,
        quantity: 1,
        name: 'Test Product'
      }]
    };

    console.log('📤 Sending test transaction to Midtrans...');
    const transaction = await snap.createTransaction(testData);

    console.log('✅ Midtrans response:', transaction);
    res.json({
      success: true,
      message: 'Midtrans connection successful',
      token: transaction.token,
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    console.error('❌ Test failed:', error.ApiResponse || error.message || error);
    res.status(500).json({
      success: false,
      message: 'Midtrans test failed',
      details: error.ApiResponse || error.message || error,
      isProduction: snap.apiConfig?.isProduction
    });
  }
});

// ✅ Endpoint Snap Token
app.post('/get-snap-token', async (req, res) => {
  console.log('🎯 POST /get-snap-token RECEIVED!');

  try {
    const { transaction_details, customer_details, item_details } = req.body;

    if (!transaction_details?.order_id || !transaction_details?.gross_amount) {
      throw new Error('Missing required fields: order_id or gross_amount');
    }

    const parameter = {
      transaction_details,
      customer_details: customer_details || {
        first_name: "Customer",
        email: "customer@example.com",
        phone: "08123456789"
      },
      item_details: item_details || [],
      credit_card: { secure: true },
    };

    console.log('📤 Sending transaction to Midtrans:', JSON.stringify(parameter, null, 2));

    const transaction = await snap.createTransaction(parameter);

    console.log('✅ Token created:', transaction.token);

    res.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });

  } catch (error) {
    console.error('❌ ERROR get-snap-token:', error.ApiResponse || error.message || error);
    res.status(500).json({
      success: false,
      message: 'Midtrans request failed',
      details: error.ApiResponse || error.message || error,
      isProduction: snap.apiConfig?.isProduction
    });
  }
});

// ✅ Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'active',
    message: '🚀 INDOCART Backend Server is running!',
    timestamp: new Date().toISOString(),
    origin: req.get('Origin'),
    environment: process.env.NODE_ENV || 'development',
    midtrans_configured: !!process.env.MIDTRANS_SERVER_KEY,
    isProduction: snap.apiConfig?.isProduction
  });
});

// ✅ Static files (paling bawah)
app.use(express.static('public'));

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', err.stack || err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Midtrans mode: ${snap.apiConfig?.isProduction ? 'Production' : 'Sandbox'}`);
});

