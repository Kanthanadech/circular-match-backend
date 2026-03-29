const https = require('https');
const body = {
  email: 'seed@circmatch.com',
  password: 'seed1234',
  companyName: 'Demo Company',
  role: 'GENERATOR',
  lat: 13.7563,
  lng: 100.5018
};
const data = Buffer.from(JSON.stringify(body));
const req = https.request({
  hostname: 'circular-match-backend-production.up.railway.app',
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log(b));
});
req.write(data);
req.end();