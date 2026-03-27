async function testFlow() {
    console.log('🚀 Starting Backend Flow Test (using fetch)...');
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
                full_name: 'Test Customer ' + Date.now(),
                phone: '9876543210',
                email: 'test@example.com',
                customer_group: 'Regular'
            })
        });
        const customerData = await customerRes.json();
        if (!customerRes.ok) throw new Error(`Customer creation failed: ${JSON.stringify(customerData)}`);
        const customerId = customerData.customer.id;
        console.log(`✅ Customer created with ID: ${customerId}`);

        // 3. Create Order with Trial Date
        console.log('🛒 Creating Order with Trial Date & Delivery Type...');
        const orderRes = await fetch(`${baseURL}/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                customer_id: customerId,
                garment_type: 'Suit',
                total_amount: 5000,
                advance_amount: 2500,
                trial_date: '2026-03-01',
                delivery_date: '2026-03-10',
                delivery_type: 'home_delivery',
                priority: 'normal'
            })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
        const orderId = orderData.order.id;
        console.log(`✅ Order created with ID: ${orderId}`);

        // 4. Verify Trial exists
        console.log('📅 Checking Trial Calendar...');
        const trialRes = await fetch(`${baseURL}/delivery/trials`, { headers });
        const trialData = await trialRes.json();
        const trialFound = trialData.trials.find((t: any) => t.id === orderId);
        if (trialFound) {
            console.log('✅ Trial found in calendar!');
        } else {
            throw new Error('❌ Trial NOT found in calendar!');
        }

        // 5. Verify Delivery exists
        console.log('🚚 Checking Delivery Tracking...');
        const deliveryRes = await fetch(`${baseURL}/delivery/tracking`, { headers });
        const deliveryData = await deliveryRes.json();
        const deliveryFound = deliveryData.deliveries.find((d: any) => d.id === orderId);
        if (deliveryFound) {
            console.log('✅ Delivery found in tracking!');
        } else {
            throw new Error('❌ Delivery NOT found in tracking!');
        }

        // 6. Test User Duty Toggle
        console.log('👥 Testing Employee Status Toggle...');
        const usersRes = await fetch(`${baseURL}/users`, { headers });
        const usersData = await usersRes.json();
        const firstUser = usersData.users[0];
        const originalStatus = firstUser.is_available;

        await fetch(`${baseURL}/users/${firstUser.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ is_available: !originalStatus })
        });

        const usersRes2 = await fetch(`${baseURL}/users`, { headers });
        const usersData2 = await usersRes2.json();
        const updatedUser = usersData2.users.find((u: any) => u.id === firstUser.id);

        if (updatedUser.is_available !== originalStatus) {
            console.log('✅ Employee status toggled successfully.');
        } else {
            throw new Error('❌ Employee status toggle failed!');
        }

        console.log('\n✨ ALL CORE BACKEND FUNCTIONALITY VERIFIED! ✨');
    } catch (error: any) {
        console.error('❌ Test failed!', error.message);
        process.exit(1);
    }
}

testFlow();
