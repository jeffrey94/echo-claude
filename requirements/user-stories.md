# User Stories

## Requester (Main User)
*Individual contributor or first-line manager seeking feedback*

### Session Creation
- **As a requester**, I want to create a feedback session with a clear focus topic so that my invitees understand what to provide feedback on
- **As a requester**, I want to add 0-3 custom questions so that I can get specific insights relevant to my growth areas
- **As a requester**, I want to invite 3-10 colleagues so that I get diverse perspectives while maintaining anonymity
- **As a requester**, I want to specify each invitee's role and relationship length so that the AI can contextualize their feedback appropriately
- **As a requester**, I want to set a deadline (7-30 days) so that I receive timely feedback

### Question Management
- **As a requester**, I want the AI to generate additional questions to reach exactly 5 total so that interviews are comprehensive but time-bounded
- **As a requester**, I want to review and approve the final question set so that I'm comfortable with what will be asked

### Progress Tracking
- **As a requester**, I want to see which invitees have completed their interviews so that I can gauge when my report will be ready
- **As a requester**, I want automatic reminders sent to non-responders so that I don't have to chase people manually

### Report & Follow-up
- **As a requester**, I want to receive an anonymous report with specific strengths and blind spots so that I understand my impact on others
- **As a requester**, I want 3 SMART actions in my report so that I have concrete next steps for improvement
- **As a requester**, I want to export my report as a PDF so that I can reference it offline or share with my manager
- **As a requester**, I want automatic scheduling of follow-up sessions so that I can track my progress over time
- **As a requester**, I want to opt out of automatic follow-ups so that I control my feedback frequency

## Invitee (Sub User)
*Peer, report, or manager providing feedback*

### Invitation & Setup
- **As an invitee**, I want to receive a clear email explanation of the audio interview process so that I know what to expect
- **As an invitee**, I want a unique start link that works during the 07:00-22:00 window so that I can participate at my convenience
- **As an invitee**, I want reminder messages at T-3 and T-1 days so that I don't forget to participate

### Interview Experience
- **As an invitee**, I want an audio-only interview (no video) so that I feel comfortable providing honest feedback
- **As an invitee**, I want visual waveform cues so that I know the system is listening and responding
- **As an invitee**, I want the interview limited to 15 minutes so that it doesn't disrupt my workday
- **As an invitee**, I want the option to reschedule if I'm a no-show so that I can still participate if something comes up

### Privacy & Trust
- **As an invitee**, I want assurance that my audio is not stored so that I trust the privacy of my feedback
- **As an invitee**, I want my comments to be anonymized before the requester sees them so that I can be completely honest
- **As an invitee**, I want protection from my writing style being identified so that my feedback truly remains anonymous

## System Administrator
*Managing the platform operations*

### Privacy & Security
- **As an admin**, I want all PII encrypted at rest so that user data is protected
- **As an admin**, I want automatic audio deletion after transcription so that no sensitive recordings are stored
- **As an admin**, I want differential privacy applied to all feedback so that individual comments cannot be de-anonymized

### Performance & Monitoring
- **As an admin**, I want to monitor completion rates below 60% so that I can identify and address user experience issues
- **As an admin**, I want alerts when retention drops below 40% so that I can investigate product-market fit concerns
- **As an admin**, I want NPS tracking with alerts for >10 point drops so that I can respond quickly to user satisfaction issues

### Scalability
- **As an admin**, I want the system to support 5,000 concurrent interviews so that usage spikes don't impact user experience
- **As an admin**, I want 95th percentile page loads under 2 seconds on 4G so that the experience is smooth for all users

## Compliance Officer
*Ensuring legal and regulatory compliance*

### Data Governance
- **As a compliance officer**, I want redacted transcripts stored for ≤365 days so that we meet data retention requirements
- **As a compliance officer**, I want SOC 2 compliance preparation scheduled post-launch so that enterprise customers can adopt the platform
- **As a compliance officer**, I want clear data processing agreements so that users understand how their information is handled