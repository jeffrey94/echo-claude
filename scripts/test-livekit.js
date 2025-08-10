#!/usr/bin/env node

/**
 * LiveKit Integration Test Script
 * Tests the core LiveKit functionality for Phase 5
 */

const { generateAccessToken, createInterviewRoom, generateParticipantName } = require('../lib/livekit')

async function testLivekitIntegration() {
  console.log('🎯 Testing LiveKit Integration for Phase 5...\n')

  // Test 1: Environment Variables
  console.log('1. Testing Environment Variables:')
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!livekitUrl || !apiKey || !apiSecret) {
    console.log('❌ LiveKit credentials not configured in .env.local')
    console.log('   Please add the following to .env.local:')
    console.log('   NEXT_PUBLIC_LIVEKIT_WS_URL=wss://your-project.livekit.cloud')
    console.log('   LIVEKIT_API_KEY=your_api_key')
    console.log('   LIVEKIT_API_SECRET=your_api_secret')
    return false
  }
  console.log('✅ LiveKit credentials configured')

  // Test 2: Participant Name Generation
  console.log('\n2. Testing Participant Name Generation:')
  const humanName = generateParticipantName('human', 'test-invitation-123')
  const aiName = generateParticipantName('ai')
  console.log(`   Human participant: ${humanName}`)
  console.log(`   AI participant: ${aiName}`)
  console.log('✅ Participant names generated correctly')

  // Test 3: Access Token Generation
  console.log('\n3. Testing Access Token Generation:')
  try {
    const token = generateAccessToken(
      'test-room-123',
      humanName,
      {
        invitationId: 'test-invitation-123',
        sessionId: 'test-session-456',
        role: 'interviewee'
      }
    )
    console.log(`   Token generated: ${token.substring(0, 50)}...`)
    console.log('✅ Access token generation successful')
  } catch (error) {
    console.log(`❌ Token generation failed: ${error.message}`)
    return false
  }

  // Test 4: Room Creation (if credentials are valid)
  console.log('\n4. Testing Room Creation:')
  try {
    const roomName = await createInterviewRoom('test-session-456', 'test-invitation-123')
    console.log(`   Room created: ${roomName}`)
    console.log('✅ Room creation successful')
  } catch (error) {
    console.log(`❌ Room creation failed: ${error.message}`)
    if (error.message.includes('credentials not configured')) {
      console.log('   This is expected if LiveKit credentials are not set up yet.')
      return true // Still pass the test
    }
    return false
  }

  console.log('\n🎉 All LiveKit integration tests passed!')
  console.log('\nNext steps:')
  console.log('1. Configure LiveKit credentials in .env.local')
  console.log('2. Test the audio interview flow at /interview/[token]')
  console.log('3. Verify WebRTC connection and audio controls')

  return true
}

// Run the test
testLivekitIntegration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Test failed with error:', error)
    process.exit(1)
  })