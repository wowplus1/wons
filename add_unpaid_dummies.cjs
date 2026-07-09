const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

// Read env variables
const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching customers...');
  const customerSnap = await getDocs(collection(db, 'customers'));
  let customers = [];
  customerSnap.forEach(d => {
    customers.push({ customer_id: d.id, ...d.data() });
  });

  if (customers.length === 0) {
    customers = [
      { customer_id: 'cust-dummy-01', name: '원스', grade: 1, loss_rate: 10, trade_type: 'price' },
      { customer_id: 'cust-dummy-02', name: '모용환', grade: 1, loss_rate: 10, trade_type: 'weight' },
      { customer_id: 'cust-dummy-03', name: '동스', grade: 2, loss_rate: 8, trade_type: 'price' }
    ];
  }

  const batch = writeBatch(db);
  const status = '출고완료';
  console.log(`Generating 50 dummy orders for unpaid ledger (status: 출고완료 & payment_status: 결제전)...`);
  
  for (let i = 1; i <= 50; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const orderDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const orderId = `ORD-TEST-unpaid-${String(i).padStart(3, '0')}`;
    
    const qty = Math.floor(Math.random() * 2) + 1;
    const baseLabor = Math.floor(Math.random() * 50) * 1000 + 10000;
    const extraLabor = Math.floor(Math.random() * 10) * 1000;
    const calculatedPrice = (baseLabor + extraLabor) * qty;

    const order = {
      order_id: orderId,
      order_date: orderDate,
      status: status,
      customer_snapshot: {
        customer_id: customer.customer_id,
        name: customer.name,
        grade: customer.grade || 1,
        phone: customer.phone || '010-1234-5678',
        loss_rate: customer.loss_rate || 0,
        trade_type: customer.trade_type || 'price'
      },
      gold_rate_snapshot: {
        buy_14k_per_g: 58000,
        buy_18k_per_g: 75000,
        buy_24k_per_g: 100000,
        sell_14k_per_g: 59000,
        sell_18k_per_g: 76000,
        sell_24k_per_g: 101000
      },
      items: [
        {
          item_id: 1,
          model_number: `벨R-${Math.floor(Math.random() * 800) + 100}`,
          division: '판매',
          manufacturer: '자체제작',
          quantity: qty,
          color: ['YG', 'WG', 'RG'][Math.floor(Math.random() * 3)],
          material: ['14K', '18K', '24K'][Math.floor(Math.random() * 3)],
          status: status,
          stone_main_id: '',
          stone_main_name: '',
          stone_sub_id: '',
          stone_sub_name: '',
          labor_base: baseLabor,
          labor_extra: extraLabor,
          labor_main: 0,
          labor_sub: 0,
          grade: customer.grade || 1,
          qty_main: 0,
          qty_sub: 0,
          stone_weight_ea: 0,
          gold_weight: parseFloat((Math.random() * 5 + 0.5).toFixed(3)),
          size: `${Math.floor(Math.random() * 15) + 5}호`,
          note: '미수대장 검증용 더미 데이터',
          release_date: orderDate,
          calculated_price: calculatedPrice,
          payment_status: '결제전',
          step_weights: {
            step1: { before: 3.5, after: 2.8 },
            step2: { before: 2.8, after: 2.0 },
            step3: { before: 2.0, after: 2.0 }
          },
          actual_weight_g: parseFloat((Math.random() * 10 + 2).toFixed(2))
        }
      ],
      total_amount: calculatedPrice,
      total_gold_weight_24k_g: parseFloat((Math.random() * 4 + 1).toFixed(3)),
      created_at: new Date().toISOString()
    };

    batch.set(doc(db, 'orders', orderId), order);
  }

  console.log(`Committing 50 unpaid dummy orders to Firestore...`);
  await batch.commit();
  console.log('Successfully added all unpaid dummy orders.');
}

run().catch(console.error);
