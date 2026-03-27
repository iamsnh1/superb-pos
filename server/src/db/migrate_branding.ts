
import { db } from './index.js';

console.log('Updating branding settings...');

try {
    const settings = [
        { key: 'business_name', value: 'Superb' },
        { key: 'address', value: '33, Chandralok Complex, Sarojini Devi Road, Secunderabad' },
        { key: 'phone', value: '9246215215' }
    ];

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    db.transaction(() => {
        for (const setting of settings) {
            stmt.run(setting.key, setting.value);
            console.log(`Updated ${setting.key}`);
        }
    })();

    console.log('Branding updated successfully.');

} catch (error) {
    console.error('Branding update failed:', error);
}
