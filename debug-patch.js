const axios = require('axios');

async function testSpecificPatchIssue() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🔍 Investigating PATCH issue...\n');
  
  // Test GET on users (should return 401 about auth)
  try {
    console.log('1. Testing GET /api/users/1 (should return 401)...');
    const response = await axios.get(`${baseURL}/users/1`);
    console.log('❌ Should have failed but got:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ GET correctly returned 401:', error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test PATCH on users (currently returns 404)
  try {
    console.log('\n2. Testing PATCH /api/users/1 (should return 401 but gets 404)...');
    const response = await axios.patch(`${baseURL}/users/1`, {
      name: 'Test User'
    });
    console.log('❌ Should have failed but got:', response.status);
  } catch (error) {
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test PATCH on comments (works correctly - returns 401)
  try {
    console.log('\n3. Testing PATCH /api/comments/1 (should return 401)...');
    const response = await axios.patch(`${baseURL}/comments/1`, {
      body: 'Updated comment'
    });
    console.log('❌ Should have failed but got:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Comments PATCH correctly returned 401:', error.response.data.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  console.log('\n🔧 ISSUE IDENTIFIED:');
  console.log('The PATCH /api/users/:id route is not being recognized by Express.');
  console.log('This is likely because Express is not properly handling PATCH methods');
  console.log('or there is a routing configuration issue.');
}

testSpecificPatchIssue().catch(console.error);
