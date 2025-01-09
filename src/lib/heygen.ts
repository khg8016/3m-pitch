import { supabase } from './supabase';

interface GenerateVideoParams {
  script: string;
  onStatusChange?: (status: string) => void;
}

export async function createTalkingVideo({ script, onStatusChange }: GenerateVideoParams): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Authentication required');
  }

  // Generate video
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const generateResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-heygen-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ script }),
  });

  if (!generateResponse.ok) {
    const error = await generateResponse.json();
    throw new Error(error.error || 'Failed to generate video');
  }

  const { video_id, polling_url, polling_interval } = await generateResponse.json();

  // Poll for video status
  while (true) {
    const statusResponse = await fetch(polling_url, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.json();
      throw new Error(error.error || 'Failed to check video status');
    }

    const { data } = await statusResponse.json();
    
    if (data.status === 'completed') {
      onStatusChange?.('Video is ready!');
      return data.video_url;
    } else if (data.status === 'failed') {
      throw new Error('Video generation failed');
    } else {
      onStatusChange?.(data.message || 'Processing video...');
    }

    // Wait for the specified polling interval (15초)
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
}
