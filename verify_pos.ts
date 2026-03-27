async function testFlow() {
    console.log('🚀 Starting Backend Flow Test (Full POS + User)...');
    const baseURL = 'http://localhost:3001/api';

    try {
        // 1. Login
        console.log('🔑 Logging in...');
        const loginRes = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@tailorflow.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        const token = loginData.token;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        console.log('✅ Logged in successfully.');

        // 2. Create Customer
        console.log('👤 Creating Test Customer...');
        const customerRes = await fetch(`${baseURL}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                full_name: 'POS Test ' + Date.now(),
                phone: '1234567890',
                customer_group: 'VIP'
            })
        });
        const customerData = await customerRes.json();
        const customerId = customerData.customer.id;
        console.log(`✅ Customer created: ${customerId}`);

        // 3. Create POS Transaction
        console.log('🛒 Creating POS Transaction...');
        const posRes = await fetch(`${baseURL}/pos/transaction`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                customer_id: customerId,
                items: [
                    {
                        garment_type: 'Shirt',
                        price: 1500,
                        trial_date: '2026-04-01',
                        delivery_date: '2026-04-05',
                        delivery_type: 'home_delivery'
                    }
                ],
                payment: { method: 'cash', amount: 1000 },
                grand_total: 1500,
                advance_amount: 1000
            })
        });
        const posData = await posRes.json();
        if (!posRes.ok) throw new Error(`POS failed: ${JSON.stringify(posData)}`);
        const orderId = posData.orderIds[0];
        console.log(`✅ POS Transaction Success. Order ID: ${orderId}`);

        // 4. Verify Trial exists
        console.log('📅 Checking Trial Calendar...');
        const trialRes = await fetch(`${baseURL}/delivery/trials`, { headers });
        const trialData = await trialRes.json();
        const trialFound = trialData.trials.find((t: any) => t.id === orderId);
        if (trialFound) {
            console.log('✅ Trial found in calendar for POS order!');
        } else {
            throw new Error('❌ Trial NOT found for POS order!');
        }

        console.log('\n✨ ALL TESTS PASSED! POS + Workroom integration verified. ✨');
    } catch (error: any) {
        console.error('❌ Test failed!', error.message);
        process.exit(1);
    }
}

testFlow();
