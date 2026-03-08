const https = require('https');
const BASE = 'https://mua-planner1.onrender.com';

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(BASE + path);
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const members = [
  // Deepika (hairstylist) - 3 more events: 1 paid, 1 partial, 1 pending
  { eventId: '89e7e586-5d82-4db7-a9d2-c57d8a909b9c', teamRole: 'hairstylist', memberName: 'Deepika', contactId: '4bac8e54-debc-499a-bcb4-acfe24b65b0a', amount: 5000, amountPaid: 5000 },
  { eventId: '226f5784-a309-4702-9d26-87603448b394', teamRole: 'hairstylist', memberName: 'Deepika', contactId: '4bac8e54-debc-499a-bcb4-acfe24b65b0a', amount: 4000, amountPaid: 2000 },
  { eventId: 'a33703b8-d496-4256-b875-da88db16c817', teamRole: 'hairstylist', memberName: 'Deepika', contactId: '4bac8e54-debc-499a-bcb4-acfe24b65b0a', amount: 3500, amountPaid: 0 },

  // Kowsalya (hairstylist) - 3 events: 1 paid, 1 partial, 1 pending
  { eventId: '89e7e586-5d82-4db7-a9d2-c57d8a909b9c', teamRole: 'hairstylist', memberName: 'Kowsalya', contactId: 'e27b0e38-5d78-417d-905e-5b43841814ac', amount: 4000, amountPaid: 4000 },
  { eventId: 'cffe4919-66f1-4445-8e15-1ee088173576', teamRole: 'hairstylist', memberName: 'Kowsalya', contactId: 'e27b0e38-5d78-417d-905e-5b43841814ac', amount: 3500, amountPaid: 1500 },
  { eventId: 'a1b839bf-7ee0-4130-99e4-7edd0b028688', teamRole: 'hairstylist', memberName: 'Kowsalya', contactId: 'e27b0e38-5d78-417d-905e-5b43841814ac', amount: 4500, amountPaid: 0 },

  // Naveen (driver) - 3 more events: 2 paid, 1 partial
  { eventId: '89e7e586-5d82-4db7-a9d2-c57d8a909b9c', teamRole: 'driver', memberName: 'Naveen', contactId: 'f7b8d428-0305-408f-8092-7b06bab43db0', amount: 2000, amountPaid: 2000 },
  { eventId: '226f5784-a309-4702-9d26-87603448b394', teamRole: 'driver', memberName: 'Naveen', contactId: 'f7b8d428-0305-408f-8092-7b06bab43db0', amount: 2500, amountPaid: 2500 },
  { eventId: 'eab2b70b-69ec-4fe0-9b01-fb5f611b19ef', teamRole: 'driver', memberName: 'Naveen', contactId: 'f7b8d428-0305-408f-8092-7b06bab43db0', amount: 3000, amountPaid: 1000 },

  // Chimiya (assistant) - 3 events: 1 partial, 2 pending
  { eventId: '89e7e586-5d82-4db7-a9d2-c57d8a909b9c', teamRole: 'assistant', memberName: 'Chimiya', contactId: 'a746835b-fdb6-4629-b6f5-c561c63ac8dc', amount: 1500, amountPaid: 500 },
  { eventId: '535b7243-5544-4c0a-986d-6eae5c74f4c3', teamRole: 'assistant', memberName: 'Chimiya', contactId: 'a746835b-fdb6-4629-b6f5-c561c63ac8dc', amount: 1500, amountPaid: 0 },
  { eventId: 'a33703b8-d496-4256-b875-da88db16c817', teamRole: 'assistant', memberName: 'Chimiya', contactId: 'a746835b-fdb6-4629-b6f5-c561c63ac8dc', amount: 2000, amountPaid: 0 },

  // Sanju (saree_drapist) - 2 more events: 1 paid, 1 partial
  { eventId: '89e7e586-5d82-4db7-a9d2-c57d8a909b9c', teamRole: 'saree_drapist', memberName: 'Sanju', contactId: 'cb395c7d-9777-4108-b26b-fcb4dc2eab19', amount: 3000, amountPaid: 3000 },
  { eventId: 'd5b2b966-bf8a-456e-bb57-a886582f5dd5', teamRole: 'saree_drapist', memberName: 'Sanju', contactId: 'cb395c7d-9777-4108-b26b-fcb4dc2eab19', amount: 2500, amountPaid: 1000 },
];

(async () => {
  let ok = 0, fail = 0;
  for (const m of members) {
    try {
      const r = await post('/api/team', m);
      if (r.success) { ok++; console.log('OK', m.memberName, m.eventId.slice(0, 8), 'amt:' + m.amount, 'paid:' + m.amountPaid); }
      else { fail++; console.log('FAIL', m.memberName, r.error); }
    } catch (e) { fail++; console.log('ERR', m.memberName, e.message); }
  }
  console.log('\nDone!', ok, 'created,', fail, 'failed');
})();
