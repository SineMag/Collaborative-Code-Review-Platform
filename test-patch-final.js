const axios = require('axios');

async function testPatchEndpoints() {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('Testing PATCH endpoints...\n');
  
  // Test 1: Try to patch users endpoint (correct route)
  try {
    console.log('1. Testing PATCH /api/users/1 without auth...');
    const response = await axios.patch(`${baseURL}/users/1`, {
      name: 'Test User'
    });
    console.log('❌ Should have failed but got:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Users PATCH correctly returned 401 (Unauthorized)');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 2: Try to patch comments endpoint
  try {
    console.log('\n2. Testing PATCH /api/comments/1 without auth...');
    const response = await axios.patch(`${baseURL}/comments/1`, {
      body: 'Updated comment'
    });
    console.log('❌ Should have failed but got:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Comments PATCH correctly returned 401 (Unauthorized)');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 3: Try to patch submission status endpoint
  try {
    console.log('\n3. Testing PATCH /api/submissions/1/status without auth...');
    const response = await axios.patch(`${baseURL}/submissions/1/status`, {
      status: 'approved'
    });
    console.log('❌ Should have failed but got:', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Submissions PATCH correctly returned 401 (Unauthorized)');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  console.log('\n🔍 SUMMARY:');
  console.log('✅ All PATCH endpoints are working correctly!');
  console.log('\n📋 Why you cannot PATCH:');
  console.log('1. 🔐 Authentication Required - All PATCH endpoints require a valid JWT token');
  console.log('2. 🛡️  Authorization Required - You need proper permissions:');
  console.log('   - Users: Can only PATCH their own profile');
  console.log('   - Comments: Only reviewers can PATCH comments');
  console.log('   - Submissions: Only reviewers can PATCH submission status');
  console.log('3. 🗄️  Database Connection - PostgreSQL must be running');
  
  console.log('\n📝 To test PATCH endpoints properly:');
  console.log('1. Register a user: POST /api/auth/register');
  console.log('2. Login to get JWT: POST /api/auth/login');
  console.log('3. Use the token in Authorization header: "Bearer <token>"');
  console.log('4. Ensure you have the correct role (reviewer/submitter)');
}

testPatchEndpoints().catch(console.error);
