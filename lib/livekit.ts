import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { Room } from 'livekit-client'

// LiveKit configuration
const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || 'wss://echo-dev.livekit.cloud'
const apiKey = process.env.LIVEKIT_API_KEY
const apiSecret = process.env.LIVEKIT_API_SECRET

if (!apiKey || !apiSecret) {
  console.warn('LiveKit credentials not configured. Audio features will not work.')
}

// Room service client for server-side operations
export const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

// Generate access token for participants
export function generateAccessToken(
  roomName: string,
  participantName: string,
  metadata?: Record<string, any>
): string {
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured')
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    // Token expires in 2 hours (max interview length)
    ttl: 2 * 60 * 60, // 2 hours in seconds
  })

  // Grant permissions for interview participants
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Allow recording for transcription
    recorder: true,
  })

  // Add metadata for tracking
  if (metadata) {
    token.metadata = JSON.stringify(metadata)
  }

  return token.toJwt()
}

// Create a new interview room
export async function createInterviewRoom(
  sessionId: string,
  invitationId: string
): Promise<string> {
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured')
  }

  const roomName = `interview-${sessionId}-${invitationId}`
  
  try {
    // Create room with specific settings for interviews
    await roomService.createRoom({
      name: roomName,
      // Max 2 participants (AI + human)
      maxParticipants: 2,
      // Auto-delete room after 3 hours
      emptyTimeout: 3 * 60 * 60,
      // Enable recording for transcription
      metadata: JSON.stringify({
        sessionId,
        invitationId,
        purpose: 'feedback_interview',
        createdAt: new Date().toISOString()
      })
    })

    console.log(`Created LiveKit room: ${roomName}`)
    return roomName
  } catch (error: any) {
    // Room might already exist
    if (error.message?.includes('already exists')) {
      console.log(`Room already exists: ${roomName}`)
      return roomName
    }
    throw error
  }
}

// Delete interview room and cleanup
export async function deleteInterviewRoom(roomName: string): Promise<void> {
  if (!apiKey || !apiSecret) {
    return // Skip if not configured
  }

  try {
    await roomService.deleteRoom(roomName)
    console.log(`Deleted LiveKit room: ${roomName}`)
  } catch (error) {
    console.error(`Failed to delete room ${roomName}:`, error)
  }
}

// Get room participants and status
export async function getRoomInfo(roomName: string) {
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured')
  }

  try {
    const room = await roomService.listRooms([roomName])
    return room[0] || null
  } catch (error) {
    console.error(`Failed to get room info for ${roomName}:`, error)
    return null
  }
}

// Client-side LiveKit configuration
export const livekitConfig = {
  serverUrl: livekitHost,
  // Audio-only configuration for interviews
  defaultVideoEnabled: false,
  defaultAudioEnabled: true,
  // Audio quality settings
  audioSettings: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // High quality audio for transcription
    channelCount: 1,
    sampleRate: 16000, // 16kHz is optimal for speech recognition
    sampleSize: 16,
  },
  // Connection quality settings
  adaptiveStream: true,
  dynacast: true,
  // Reconnection settings
  reconnectPolicy: {
    nextRetryDelayInMs: (context: any) => {
      return Math.min(30_000, 1_000 * Math.pow(2, context.retryCount))
    },
    maxRetryCount: 10,
  }
}

// Utility function to generate participant names
export function generateParticipantName(type: 'human' | 'ai', invitationId?: string): string {
  if (type === 'ai') {
    return 'echo-ai-interviewer'
  }
  return `human-${invitationId || 'anonymous'}`
}