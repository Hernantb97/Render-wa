require('dotenv').config();
const { supabase } = require('./lib/supabase');

async function testSchema() {
  try {
    const phoneNumber = '+1234567890';
    console.log('Using test phone number:', phoneNumber);

    // Test: Try to insert messages with different status values
    const testCases = [
      { status: 'received', shouldSucceed: true },
      { status: 'sent', shouldSucceed: true },
      { status: 'active', shouldSucceed: false },
      { status: 'invalid', shouldSucceed: false }
    ];

    for (const testCase of testCases) {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .insert([{
            user_id: phoneNumber,
            message: 'Test message',
            status: testCase.status,
            last_message_time: new Date().toISOString()
          }]);

        if (error) {
          console.log(`Test case ${testCase.status}: ${testCase.shouldSucceed ? 'Failed ❌' : 'Passed ✅'}`);
          console.log('Error:', error.message);
        } else {
          console.log(`Test case ${testCase.status}: ${testCase.shouldSucceed ? 'Passed ✅' : 'Failed ❌'}`);
        }
      } catch (err) {
        console.error(`Error in test case ${testCase.status}:`, err);
      }
    }

    // Verify the data was inserted correctly
    console.log('\nVerifying inserted data:');
    const { data: records, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', phoneNumber)
      .order('last_message_time', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('Error fetching records:', fetchError);
    } else {
      console.log('Recent records:', records);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSchema(); 